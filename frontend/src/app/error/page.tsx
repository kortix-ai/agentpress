'use client'

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Oops!</h1>
        <p className="mt-4 text-gray-600">Sorry, something went wrong.</p>
        <a
          href="/login"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Try again
        </a>
      </div>
    </div>
  )
} 