import Cta from "./components/Cta";
import Hero from "./components/Hero";
import Modules from "./components/Modules";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Hero/>

      <Modules/>

      <Cta/>

    </div>
  );
}