import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { tags, imageTags } from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const tagsRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        description: z.string().max(256).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [tag] = await ctx.db.insert(tags).values({
        name: input.name,
        description: input.description,
      }).returning();
      return tag;
    }),

  delete: publicProcedure
    .input(z.object({ pk: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedTag] = await ctx.db
        .delete(tags)
        .where(eq(tags.pk, input.pk))
        .returning();
      return deletedTag;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.tags.findMany({
      orderBy: (tags, { asc }) => [asc(tags.name)],
    });
  }),

  assignTagToPhotos: publicProcedure
    .input(z.object({
      tagPk: z.string().uuid(),
      photoPks: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create tag-photo relationships
      await ctx.db.insert(imageTags)
        .values(
          input.photoPks.map(photoPk => ({
            image_pk: photoPk,
            tag_pk: input.tagPk,
          }))
        )
        .onConflictDoNothing(); // Skip if relationship already exists

      return { success: true };
    }),

  removeTagFromPhotos: publicProcedure
    .input(z.object({
      tagPk: z.string().uuid(),
      photoPks: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(imageTags)
        .where(
          and(
            eq(imageTags.tag_pk, input.tagPk),
            inArray(imageTags.image_pk, input.photoPks)
          )
        );

      return { success: true };
    }),

  getPhotosWithTag: publicProcedure
    .input(z.object({
      tagPk: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const photos = await ctx.db
        .select({ image_pk: imageTags.image_pk })
        .from(imageTags)
        .where(eq(imageTags.tag_pk, input.tagPk));

      return photos.map(p => p.image_pk);
    }),
});
