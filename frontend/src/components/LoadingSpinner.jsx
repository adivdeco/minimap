import React from 'react';

const NeonLoader = () => {
    const text = "LOADING...";

    return (
        /* Full Screen Wrapper for Centering */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f12]">

            {/* Container for Loader */}
            <div className="relative flex items-center justify-center w-[400px] h-[400px] rounded-full font-sans text-white select-none">

                {/* Injecting custom keyframes for the complex shadow animations */}
                <style>
                    {`
            @keyframes rotate-shadow {
              0% {
                transform: rotate(0deg);
                box-shadow:
                  0 10px 30px 0 rgba(255, 255, 255, 0.4) inset,
                  0 20px 50px 0 #ad5fff inset,
                  0 50px 80px 0 #471eec inset;
              }
              50% {
                transform: rotate(180deg);
                box-shadow:
                  0 10px 30px 0 rgba(255, 255, 255, 0.4) inset,
                  0 20px 40px 0 #d60a47 inset,
                  0 50px 80px 0 #311e80 inset;
              }
              100% {
                transform: rotate(360deg);
                box-shadow:
                  0 10px 30px 0 rgba(255, 255, 255, 0.4) inset,
                  0 20px 50px 0 #ad5fff inset,
                  0 50px 80px 0 #471eec inset;
              }
            }

            @keyframes text-glow {
              0%, 100% {
                opacity: 0.3;
                transform: scale(1);
                text-shadow: 0 0 0 transparent;
              }
              25% {
                opacity: 1;
                transform: scale(1.1);
                text-shadow: 0 0 10px #fff, 0 0 20px #ad5fff;
              }
              50% {
                opacity: 0.5;
                transform: scale(1);
                text-shadow: 0 0 0 transparent;
              }
            }
          `}
                </style>

                {/* Main Inner Ring */}
                <div
                    className="absolute inset-0 w-full h-full rounded-full z-0 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)]"
                    style={{ animation: 'rotate-shadow 4s linear infinite' }}
                />

                {/* Outer Glow (Blur Layer) */}
                <div
                    className="absolute -inset-[25px] rounded-full blur-[40px] opacity-60 -z-10"
                    style={{ animation: 'rotate-shadow 3s linear infinite' }}
                />

                {/* Text Container */}
                <div className="z-10 flex gap-[3px] text-3xl font-bold tracking-widest">
                    {text.split('').map((char, index) => (
                        <span
                            key={index}
                            className="inline-block font-orbitron opacity-30"
                            style={{
                                animation: `text-glow 4s ease-in-out infinite`,
                                animationDelay: `${index * 0.15}s`
                            }}
                        >
                            {char}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NeonLoader;