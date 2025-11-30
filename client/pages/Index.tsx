import { useState } from "react";

export default function Index() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-0 flex justify-between items-center md:px-8 md:py-0 -mt-6">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2Fa79f59e10394423cbf0b2f4969bf9328%2Fa208ab03690c419a893f87deb701fbc2?format=webp&width=800"
          alt="Unbaked logo"
          className="h-36 w-auto"
        />
        <a
          href="#waitlist-form"
          className="bg-white text-black px-6 py-2 rounded-full font-semibold text-sm md:text-base hover:bg-gray-100 transition-colors mr-4 inline-block"
        >
          Join waitlist
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="px-6 py-4 md:px-8 md:py-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 bg-gradient-azure bg-clip-text text-transparent px-8 md:px-16">
            Less weed. More you.
          </h1>
          <p className="text-gray-300 text-center text-[10px] md:text-[11px] max-w-2xl px-8 md:px-16 leading-tight">
            Join the waitlist and get 3 months free access to all features when
            we launch — no card required.
          </p>
        </section>

        {/* Phone Mockup Section */}
        <section className="px-6 md:px-8 py-8 md:py-12 flex justify-center">
          <div className="relative w-full max-w-[280px]">
            <div className="absolute -inset-12 bg-gradient-azure rounded-3xl blur-3xl opacity-40 -z-10"></div>
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa79f59e10394423cbf0b2f4969bf9328%2F645089bea62c4c7aa8c986f41b8635d8?format=webp&width=800"
              alt="Unbaked app interface showing 30-Day Detox Progress with 76% recovery"
              className="w-full h-auto relative z-10"
            />
          </div>
        </section>

        {/* Waitlist Count Section */}
        <section className="px-6 md:px-8 py-6 flex justify-center">
          <div className="border border-gray-700 rounded-full px-6 py-3 flex items-center gap-3 bg-gray-900 bg-opacity-50">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border border-gray-700"></div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-gray-700"></div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border border-gray-700"></div>
            </div>
            <span className="text-white text-sm font-medium">
              Join 284 others on the waitlist
            </span>
          </div>
        </section>

        {/* Signup Form Section */}
        <section
          id="waitlist-form"
          className="px-6 md:px-8 py-12 flex justify-center"
        >
          <div className="w-full max-w-md">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
              Join the waitlist
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
                required
              />
              <button
                type="submit"
                className="w-full py-4 bg-white text-black rounded-full font-bold text-base md:text-lg hover:bg-gray-100 transition-colors"
              >
                Claim 3 Months Free
              </button>
            </form>

            {submitted && (
              <p className="text-cyan-400 text-center mt-4 text-sm">
                Thanks for joining! Check your email.
              </p>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 md:px-8 py-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>
            Unbaked © 2025 |{" "}
            <a
              href="#"
              className="text-white hover:text-cyan-400 transition-colors"
            >
              Privacy
            </a>{" "}
            |{" "}
            <a
              href="#"
              className="text-white hover:text-cyan-400 transition-colors"
            >
              Terms
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
