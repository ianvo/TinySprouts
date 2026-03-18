import Head from "next/head";
import styles from "@/styles/Home.module.css";
import dynamic from "next/dynamic";

const AppWithoutSSR = dynamic(() => import("@/App"), { ssr: false });

export default function Home() {
    return (
        <>
            <Head>
                <title>Tiny Sprouts</title>
                <meta name="description" content="Tiny Sprouts is a kid-friendly collection of mini-games for counting, memory, patterns, addition, and subtraction." />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Pangolin&display=swap" rel="stylesheet" />
                <link rel="icon" href="/favicon.png" />
            </Head>
            <main className={styles.main}>
                <AppWithoutSSR />
            </main>
        </>
    );
}
