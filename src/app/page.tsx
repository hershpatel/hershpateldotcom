import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#413F3D] py-16">
      <div className="container mx-auto max-w-[1320px] px-4">
        <div className="flex flex-col items-center">
          <Image
            src="/hersh.jpg"
            alt="Hersh Patel"
            width={135}
            height={135}
            className="rounded-full mb-4"
            priority
          />
          <h1 className="text-[3rem] font-light leading-[4.8rem] mt-4 mb-0 text-dark">Hersh</h1>
          <h2 className="text-[1.6rem] leading-[3rem] text-secondary text-center max-w-[54rem] px-5">patel <span className="text-light">[dot]</span> hersh <span className="text-light">[at]</span> rutgers <span className="text-light">[dot]</span> edu</h2>

          <div className="w-full max-w-[54rem] mt-16">
            <h4 className="text-[1.6rem] font-medium text-dark mb-8 px-5 text-center">about</h4>
            <div className="space-y-2">
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; senior software engineer at <Link href="https://aws.amazon.com/iot-fleetwise/" target="_blank" rel="noopener noreferrer" className="link-style">AWS IoT FleetWise</Link> (2021 - 2024)</h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; studied Computer Science + Economics at Rutgers University (2019)</h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; <Link href="https://goodreads.com/hershp" target="_blank" rel="noopener noreferrer" className="link-style">reading</Link>, <Link href="https://www.strava.com/athletes/hershpatel" target="_blank" rel="noopener noreferrer" className="link-style">running</Link>, <Link href="https://soundcloud.com/hershpatel" target="_blank" rel="noopener noreferrer" className="link-style">jamming</Link>, and <Link href="/photos" className="link-style">snapping photos</Link></h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; reach out to me on <Link href="https://linkedin.com/in/hershp" target="_blank" rel="noopener noreferrer" className="link-style">LinkedIn</Link> or <Link href="https://twitter.com/thehershp" target="_blank" rel="noopener noreferrer" className="link-style">X</Link></h2>
            </div>

            <div className="my-16"></div>

            <h4 className="text-[1.6rem] font-medium text-dark mb-8 px-5 text-center">past</h4>
            <div className="space-y-2">
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; software engineer at <Link href="https://docs.aws.amazon.com/iot-sitewise/latest/appguide/what-is-monitor-app.html" target="_blank" rel="noopener noreferrer" className="link-style">AWS IoT SiteWise</Link> (2018 - 2021)</h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; youth activities volunteer at <Link href="http://www.bapscharities.org/" target="_blank" rel="noopener noreferrer" className="link-style">BAPS Charities</Link> (2011 - now)</h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; worked with <Link href="http://amazon.com/db" target="_blank" rel="noopener noreferrer" className="link-style">Amazon</Link> (2018), <Link href="https://www.bloomberg.com/energy" target="_blank" rel="noopener noreferrer" className="link-style">Bloomberg</Link> (2017), <Link href="http://www.nbcunicareers.com/mediatech" target="_blank" rel="noopener noreferrer" className="link-style">NBCUniversal</Link> (2016)</h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; led <Link href="http://tedxrutgers.com" target="_blank" rel="noopener noreferrer" className="link-style">TEDxRutgers</Link> in <Link href="https://tedxrutgers.com/2019conf/" target="_blank" rel="noopener noreferrer" className="link-style">2019</Link>, <Link href="https://tedxrutgers.com/2017conf/" target="_blank" rel="noopener noreferrer" className="link-style">2017</Link>, <Link href="https://tedxrutgers.com/2016conf/" target="_blank" rel="noopener noreferrer" className="link-style">2016</Link></h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; studied smart cities under <Link href="https://www.cs.rutgers.edu/~dz220/" target="_blank" rel="noopener noreferrer" className="link-style">Professor Desheng Zhang</Link> (2018 - 2019)</h2>
              <h2 className="text-[1.6rem] leading-[3rem] text-light px-5">&bull; teaching assistant for <Link href="https://myrbs.business.rutgers.edu/sites/default/files/syllabi/136-business-analytics-information-technology/33_136_388.pdf" target="_blank" rel="noopener noreferrer" className="link-style">business programming</Link> (2018) and <Link href="https://www.cs.rutgers.edu/academics/undergraduate/course-synopses/course-details/01-198-206-introduction-to-discrete-structures-ii" target="_blank" rel="noopener noreferrer" className="link-style">discrete structures II</Link> (2018)</h2>
            </div>

            <div className="my-16"></div>
            
            <h2 className="text-[1.5rem] text-light text-center">&copy; hersh patel {new Date().getFullYear()}</h2>
          </div>
        </div>
      </div>
    </main>
  );
}
