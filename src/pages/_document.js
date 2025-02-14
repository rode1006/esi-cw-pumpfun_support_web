import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel='icon' href='./pumpfunlogo.webp' />
        <Script src="/charting_library/charting_library.js" strategy="beforeInteractive"></Script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
