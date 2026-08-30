import monesizeLogo from "@/assets/monesize-logo.svg";

export default function PoweredByFooter() {
  return (
    <footer className="w-full pt-4 pb-6 flex items-center justify-center gap-2 text-foreground/60 text-sm safe-bottom">
      <span>Powered by</span>
      <img src={monesizeLogo} alt="Monesize" className="h-4" />
    </footer>
  );
}
