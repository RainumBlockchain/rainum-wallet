"use client";

import { Shield, Lock, Eye, Check, Server, Users } from "lucide-react";

export default function SecurityTrustBadges() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "AES-256 Encryption",
      description: "Military-grade encryption protects your wallet data",
      color: "text-[#61dca3]",
    },
    {
      icon: Shield,
      title: "WebAuthn/FIDO2",
      description: "Biometric authentication with Touch ID & Face ID",
      color: "text-[#61b3dc]",
    },
    {
      icon: Eye,
      title: "Zero-Knowledge Privacy",
      description: "ZK-SNARKs ensure complete transaction privacy",
      color: "text-[#61dca3]",
    },
    {
      icon: Check,
      title: "Non-Custodial",
      description: "You own your keys, you own your crypto",
      color: "text-[#61b3dc]",
    },
  ];

  const trustMetrics = [
    {
      icon: Users,
      value: "10,000+",
      label: "Active Users",
      color: "text-[#61dca3]",
    },
    {
      icon: Server,
      value: "99.9%",
      label: "Uptime",
      color: "text-[#61b3dc]",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Security Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Enterprise-Grade Security
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-[#0019ff] transition-all duration-300 hover:shadow-lg"
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded-lg mb-3 group-hover:bg-[#0019ff]/5 transition-colors duration-300">
                <feature.icon
                  size={24}
                  className={`${feature.color} group-hover:scale-110 transition-transform duration-300`}
                />
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Metrics */}
      <div className="flex items-center justify-center gap-8">
        {trustMetrics.map((metric, index) => (
          <div
            key={index}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-6 py-3 hover:border-[#0019ff] transition-all duration-300 hover:shadow-md"
          >
            <metric.icon size={24} className={metric.color} />
            <div>
              <div className="text-xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-xs text-gray-600">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trust Statement */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 max-w-2xl mx-auto">
          Your security is our priority. Rainum uses industry-standard encryption and never stores your private keys on our servers.
          <span className="font-semibold text-gray-900"> You have full control of your assets at all times.</span>
        </p>
      </div>
    </div>
  );
}
