import { useState } from "react";
import MailerLiteForm from "../components/MailerLiteForm";

export default function Index() {
  const [waitlistCount, setWaitlistCount] = useState(284);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-0 flex justify-between items-center md:px-8 md:py-0 -mt-6">
        <a
          href="https://unbakedapp.com"
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fa79f59e10394423cbf0b2f4969bf9328%2Fa208ab03690c419a893f87deb701fbc2?format=webp&width=800"
            alt="Unbaked logo"
            className="h-36 w-auto"
          />
        </a>
        <a
          href="#waitlist-form"
          className="bg-white text-black px-6 py-2 rounded-full font-semibold text-sm md:text-base hover:bg-gray-100 transition-colors mr-4 inline-block"
        >
          Join waitlist
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section - Two Column on Desktop */}
        <section className="px-6 md:px-8 py-0 -mt-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center lg:py-12">
          {/* Left Column - Text and Social Proof */}
          <div className="lg:flex lg:flex-col lg:justify-center">
            {/* Waitlist Count Section */}
            <div className="md:hidden lg:block mb-8">
              <div className="border border-gray-700 rounded-full px-6 py-3 flex items-center gap-3 bg-gray-900 bg-opacity-50 w-fit">
                <div className="flex -space-x-2">
                  <img
                    src="https://images.pexels.com/photos/3805874/pexels-photo-3805874.jpeg"
                    alt="Person 1"
                    className="w-8 h-8 rounded-full object-cover border border-gray-700"
                  />
                  <img
                    src="https://images.pexels.com/photos/1113976/pexels-photo-1113976.jpeg"
                    alt="Person 2"
                    className="w-8 h-8 rounded-full object-cover border border-gray-700"
                  />
                  <img
                    src="https://images.pexels.com/photos/19797383/pexels-photo-19797383.jpeg"
                    alt="Person 3"
                    className="w-8 h-8 rounded-full object-cover border border-gray-700"
                  />
                </div>
                <span className="text-white text-[11px] font-medium whitespace-nowrap">
                  Join {waitlistCount} others
                </span>
              </div>
            </div>

            {/* Hero Headline and Subheadline */}
            <h1 className="text-2xl md:text-3xl lg:text-6xl font-bold mb-4 bg-gradient-azure bg-clip-text text-transparent px-8 md:px-16 lg:px-0 lg:mb-6">
              Less weed. More you.
            </h1>
            <p className="text-gray-300 text-[10px] md:text-[11px] lg:text-lg max-w-2xl px-8 md:px-16 lg:px-0 leading-tight lg:leading-relaxed">
              Join the waitlist and get 3 months free access to all features when
              we launch — no card required.
            </p>
          </div>

          {/* Right Column - Phone Mockup */}
          <div className="hidden md:flex justify-center lg:justify-center">
            <div className="relative w-full max-w-[280px] md:max-w-xs pt-6 md:pt-8 pb-3 lg:pt-0 lg:pb-0">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-azure rounded-full blur-2xl opacity-40 -z-10"></div>
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa79f59e10394423cbf0b2f4969bf9328%2F645089bea62c4c7aa8c986f41b8635d8?format=webp&width=800"
                alt="Unbaked app interface showing 30-Day Detox Progress with 76% recovery"
                className="w-full h-auto relative z-10"
              />
            </div>
          </div>
        </section>

        {/* Mobile Phone Mockup Section - Mobile Only */}
        <section className="px-6 md:hidden pt-6 pb-3 flex justify-center">
          <div className="relative w-full max-w-[280px]">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-azure rounded-full blur-2xl opacity-40 -z-10"></div>
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa79f59e10394423cbf0b2f4969bf9328%2F645089bea62c4c7aa8c986f41b8635d8?format=webp&width=800"
              alt="Unbaked app interface showing 30-Day Detox Progress with 76% recovery"
              className="w-full h-auto relative z-10"
            />
          </div>
        </section>

        {/* Waitlist Count Section - Mobile and Tablet Only */}
        <section className="px-6 md:px-8 py-3 flex justify-center lg:hidden">
          <div className="border border-gray-700 rounded-full px-6 py-3 flex items-center gap-3 bg-gray-900 bg-opacity-50">
            <div className="flex -space-x-2">
              <img
                src="https://images.pexels.com/photos/3805874/pexels-photo-3805874.jpeg"
                alt="Person 1"
                className="w-8 h-8 rounded-full object-cover border border-gray-700"
              />
              <img
                src="https://images.pexels.com/photos/1113976/pexels-photo-1113976.jpeg"
                alt="Person 2"
                className="w-8 h-8 rounded-full object-cover border border-gray-700"
              />
              <img
                src="https://images.pexels.com/photos/19797383/pexels-photo-19797383.jpeg"
                alt="Person 3"
                className="w-8 h-8 rounded-full object-cover border border-gray-700"
              />
            </div>
            <span className="text-white text-[11px] font-medium whitespace-nowrap">
              Join {waitlistCount} others on the waitlist
            </span>
          </div>
        </section>

        {/* Signup Form Section */}
        <section
          id="waitlist-form"
          className="px-6 md:px-8 py-2 pb-24 flex justify-center"
        >
          <MailerLiteForm
            onSubmit={() => setWaitlistCount((prev) => prev + 1)}
          />
        </section>

        {/* Footer */}
        <footer className="px-6 md:px-8 py-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>
            Unbaked © 2025 |{" "}
            <a
              href="/privacy"
              className="text-white hover:text-white hover:underline transition-colors"
            >
              Privacy
            </a>{" "}
            |{" "}
            <a
              href="/terms"
              className="text-white hover:text-white hover:underline transition-colors"
            >
              Terms
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
