import Link from "next/link";

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#23220f]/80 backdrop-blur-md border-b border-[#f0f0eb] dark:border-[#383726]">
            <div className="px-4 md:px-8 xl:px-12 py-3 mx-auto max-w-[1600px]">
                <div className="flex items-center justify-between gap-4">

                    {/* Logo */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="size-8 text-[#181811] dark:text-white">
                                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                                        fill="currentColor"
                                    ></path>
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Miayis</h1>
                        </Link>
                    </div>

                    {/* Centered Input Field */}
                    <div className="flex-1 max-w-[600px] mx-4 hidden md:block">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-gray-400">link</span>
                            </div>
                            <input
                                className="block w-full pl-12 pr-14 py-3 bg-[#f2f2ef] dark:bg-[#323122] border-none rounded-full text-sm font-medium placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-[#323122] transition-all shadow-sm outline-none"
                                placeholder="Paste a product link to save..."
                                type="text"
                            />
                            <div className="absolute inset-y-0 right-1.5 flex items-center">
                                <button className="bg-white dark:bg-[#45432a] hover:bg-primary dark:hover:bg-primary text-black p-1.5 rounded-full shadow-sm transition-colors duration-200 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button className="hidden lg:flex h-10 px-5 items-center justify-center rounded-full bg-primary text-[#181811] text-sm font-bold shadow-sm hover:brightness-95 transition-all">
                            Upgrade Pro
                        </button>
                        <button className="flex size-10 items-center justify-center rounded-full bg-[#f2f2ef] dark:bg-[#323122] hover:bg-[#e8e8e3] dark:hover:bg-[#45432a] transition-colors text-[#181811] dark:text-white">
                            <span className="material-symbols-outlined text-[22px]">notifications</span>
                        </button>
                        <button className="flex size-10 items-center justify-center rounded-full bg-[#f2f2ef] dark:bg-[#323122] hover:bg-[#e8e8e3] dark:hover:bg-[#45432a] transition-colors overflow-hidden">
                            {/* User Avatar Placeholder - Using a generic colored div if image fails, or keep the image URL from example */}
                            <img
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6b_x1cGyKHwTZXny5XtOeii2ZfFOt3bXPAcwpAAwIZpdMcATHvni4HSIPkdPkcKQOB5Ort30XSaPfwvPAZPJRtyBHfrsDp01QUz-c6uxHNW9fRU7Iv8MWf5xYKnoca1xDlkoT5xHYbUPgIAk0KA_NUN50ADAvarS_pwnSjc_BY0No11mQ1SMKwMTBPix2XF4TqDMCjPvEAHOsH6IOCOzpkcuNSl2zHisasvhK0GPgW01HVcWicNXviT7Xa8zVVOaraxArWZ7rpm36"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
