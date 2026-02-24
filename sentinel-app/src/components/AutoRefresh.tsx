"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ interval = 5000 }: { interval?: number }) {
    const router = useRouter();

    useEffect(() => {
        const minterval = setInterval(() => {
            router.refresh();
        }, interval);

        return () => clearInterval(minterval);
    }, [router, interval]);

    return null;
}
