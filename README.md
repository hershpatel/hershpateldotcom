Hersh Patel's Personal Website

www.hershpatel.com

Built with TypeScript, Next.js, Tailwind CSS, Vercel, Supabase, Amazon S3, and Amazon CloudFront.

## Installation Guide

To clone and install:

```bash
# Clone this repository
git clone https://github.com/hershpatel/hershpateldotcom.git
cd hershpateldotcom

# Install dependencies
pnpm install && pnpm build
```

## Quick Start Guide

Here's the quickest way to get the site up and running:

1. Ensure you have all prerequisites (Node.js, pnpm, etc.)
2. Configure the environment variables (see Configuration for details)
3. Build and run locally:

```bash
pnpm dev
```

Then navigate to http://localhost:3000 to see the website in action.

> Note: The "/photos" page should be available at http://localhost:3000/photos

## Documentation

### Prerequisites

- Node.js (v16 or above recommended)
- npm (v8 or above recommended)
- A Supabase account (if you intend to use the same data layer)
- AWS S3/CloudFront setup if you plan on serving images or assets from AWS

### Configuration

This application expects certain environment variables to be set. For example:

- NEXT_PUBLIC_SUPABASE_URL: The URL for your Supabase instance
- NEXT_PUBLIC_SUPABASE_ANON_KEY: The public key to access Supabase data
- AWS_REGION, AWS_S3_BUCKET, etc., if you wish to upload or fetch images from S3

Be sure to create a .env.local file in the root directory with the above variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AWS_REGION=
AWS_S3_BUCKET=
...
```

### Features

1. Next.js & TypeScript
   - Server-side rendering for optimal performance
   - Strong type safety with TypeScript
   - API routes for serverless backend functionality
   - Built-in image optimization with Next.js Image component

2. Tailwind CSS
   - Responsive design system with mobile-first approach
   - Custom utility classes for consistent styling
   - Optimized production builds with minimal CSS
   - Dynamic responsive grid layouts

3. Dynamic Photo Gallery (/photos)
   - Responsive grid layout with automatic sizing
   - Lazy loading for optimized performance
   - Image optimization pipeline:
     * Automatic WebP conversion
     * Multiple resolution variants (thumbnail, gallery, full)
     * EXIF metadata extraction and storage
   - Advanced filtering capabilities:
     * Date-based filtering
     * Tag-based organization
     * Sort by newest/oldest/random
   - Lightbox view for full-size images

4. Database & Storage
   - Supabase PostgreSQL database with Drizzle ORM
   - Amazon S3 for scalable image storage
   - Amazon CloudFront for global CDN delivery
   - Efficient image metadata management
   - Tagging system for photo organization

5. Admin Interface (/shh)
   - Secure authentication system
   - Bulk image upload functionality
   - Image optimization controls
   - Tag management system
   - Deletion and cleanup tools

6. Development Features
   - Type-safe API with tRPC
   - Environment variable management
   - Database migration system with Drizzle Kit
   - ESLint & Prettier configuration
   - Efficient development workflow with pnpm

7. Deployment
   - Serverless deployment on Vercel
   - Automatic CI/CD pipeline
   - Environment configuration management
   - Production-ready optimization
   - Weekly health check
