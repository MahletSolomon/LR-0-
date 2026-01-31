export function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
            <div className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} My App. All rights reserved.</p>
            </div>
        </footer>
    );
}
