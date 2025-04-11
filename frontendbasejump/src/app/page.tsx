import Link from 'next/link';

export default async function Index() {

  return (
    <div className="w-full flex flex-col items-center">
      <span>Landing Page Goes Here</span>
        <Link href="/dashboard">Dashboard</Link>
    </div>
  )
}
