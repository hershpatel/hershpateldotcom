import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
            <h1 className="text-[2rem] text-light">404 page not found</h1>
            <div className="my-4"></div>
            <h1 className="text-[1.3rem] text-light">
                <Link href="/" className="link-style">home</Link>
            </h1>
        </div>
    </main>
  );
}
