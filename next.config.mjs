/** @type {import('next').NextConfig} */
const nextConfig = {
  // Database drivers load native code or optional modules at runtime; keep them out of the bundle.
  serverExternalPackages: ["better-sqlite3", "pg"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
