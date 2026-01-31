export default function About() {
    return (
        <div className="max-w-2xl mx-auto pt-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">About Us</h1>
            <div className="prose prose-gray">
                <p className="text-lg text-gray-600 mb-4">
                    This project was generated as a starter template for Next.js 15+ with App Router.
                </p>
                <p className="text-gray-600">
                    It includes a basic layout with Header and Footer, and demonstrates simple routing between pages.
                    Navigate through the file structure to see how components are organized.
                </p>
            </div>
        </div>
    );
}
