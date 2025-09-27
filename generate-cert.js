const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Generate self-signed certificate for local HTTPS testing
const generateCertificate = () => {
  const forge = require("node-forge");
  const pki = forge.pki;

  // Generate a keypair
  console.log("Generating self-signed certificate for local HTTPS...");
  const keys = pki.rsa.generateKeyPair(2048);

  // Create a certificate
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    {
      name: "commonName",
      value: "localhost",
    },
    {
      name: "countryName",
      value: "US",
    },
    {
      shortName: "ST",
      value: "Test",
    },
    {
      name: "localityName",
      value: "Test",
    },
    {
      name: "organizationName",
      value: "TripGo Local",
    },
    {
      shortName: "OU",
      value: "Test",
    },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Add extensions
  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: true,
    },
    {
      name: "keyUsage",
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: "extKeyUsage",
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: "nsCertType",
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true,
    },
    {
      name: "subjectAltName",
      altNames: [
        {
          type: 2,
          value: "localhost",
        },
        {
          type: 2,
          value: "192.168.1.4",
        },
        {
          type: 7,
          ip: "127.0.0.1",
        },
        {
          type: 7,
          ip: "192.168.1.4",
        },
      ],
    },
  ]);

  // Self-sign certificate
  cert.sign(keys.privateKey);

  // Convert to PEM format
  const pem = pki.certificateToPem(cert);
  const key = pki.privateKeyToPem(keys.privateKey);

  return { cert: pem, key: key };
};

module.exports = { generateCertificate };
