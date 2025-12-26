import { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>The Drop - Scrolly Game Jam</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/* We removed ContextProvider, AppBar, and Footer to fix the errors */}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;