"use client";

import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen p-8 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold hover:text-gray-700 dark:hover:text-gray-400 transition-colors">Suna | General AI Agent</h1>
          <ThemeToggle />
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow dark:hover:bg-gray-700 transition-colors">
          <p className="text-gray-700 dark:text-gray-400 transition-colors">Theme implementation example</p>
        </div>
      </div>
    </div>
  );
}
