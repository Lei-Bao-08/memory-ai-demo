/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['microsoft-cognitiveservices-speech-sdk'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('microsoft-cognitiveservices-speech-sdk');
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };
    return config;
  },
}

module.exports = nextConfig 