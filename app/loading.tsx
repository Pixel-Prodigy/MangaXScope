import Image from "next/image";

export default function Loading() {
  return (
    <div
      style={{ zIndex: 99999 }}
      className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black"
    >
      <Image
        src="/loading.gif"
        alt="Loading"
        width={224}
        height={224}
        className="w-56"
        unoptimized
        priority
      />
    </div>
  );
}

