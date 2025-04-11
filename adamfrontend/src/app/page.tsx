"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-8 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold hover:text-gray-700 dark:hover:text-gray-400 transition-colors">Kortix <span className="text-blue-500">/</span> <span className="text-blue-600">Suna</span></h1>
          <ThemeToggle />
        </div>
        <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow dark:hover:bg-gray-700 transition-colors">
          <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">Welcome to Suna</h2>
          <p className="text-gray-700 dark:text-gray-400 transition-colors mb-6">
            A powerful General AI Agent to help you accomplish your tasks with ease.
          </p>
          <div className="mt-8">
            <Link 
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-sm border border-blue-600 transition-all duration-200"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
