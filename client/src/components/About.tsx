export default function About() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-accent/20 rounded-3xl transform rotate-3"></div>
            <div className="relative rounded-3xl shadow-xl w-full h-full overflow-hidden">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-3xl">
                <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center p-8">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-600 font-medium">Our Team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-black">Who We Are</h2>
            <p className="text-gray-600 text-lg mb-6">
              Robin was founded by a team of financial experts and AI engineers who recognized the challenges facing modern financial consultants.
            </p>
            <p className="text-gray-600 text-lg mb-6">
              Our mission is to empower financial consultants with cutting-edge technology that simplifies complex tasks, automates documentation, and provides deeper insights into client portfolios.
            </p>
            <p className="text-gray-600 text-lg mb-8">
              Since our founding in 2020, we've helped over 500 financial consultants save thousands of hours and grow their practices by an average of 30%.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-4xl font-bold text-secondary">500+</p>
                <p className="text-gray-500">Consultants</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-secondary">$5B+</p>
                <p className="text-gray-500">AUM Managed</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-secondary">98%</p>
                <p className="text-gray-500">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
