export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 text-sm py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between gap-4">
        <p>&copy; {new Date().getFullYear()} AF Apparels. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-white">Privacy</a>
          <a href="/terms" className="hover:text-white">Terms</a>
          <a href="/contact" className="hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}
