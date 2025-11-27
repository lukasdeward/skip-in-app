<script setup lang="ts">
useSeoMeta({
  title: 'Data Protection',
  description: 'How Skip In-App collects, uses, and protects account and billing data.'
})
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 mb-10 prose prose-neutral">
    <h1>Data Protection</h1>

    <h2>Controller</h2>
    <p>
      Skip In-App (operated by OneGuard)<br>
      Munich, Germany<br>
      Contact: <a href="mailto:support@skip-in.app">support@skip-in.app</a>
    </p>

    <h2>Data We Collect</h2>
    <ul>
      <li><strong>Account data:</strong> Name, email address, and authentication metadata needed to sign in.</li>
      <li><strong>Subscription and billing data:</strong> Plan selections, invoices, and billing address details for paid workspaces.</li>
      <li><strong>Payment data via Stripe:</strong> Payment method tokens, billing address, and tax/VAT details handled by Stripe as our payment processor.</li>
      <li><strong>Product usage:</strong> Basic log events (e.g., device/browser info, timestamps, feature usage) for reliability, abuse prevention, and product improvement.</li>
      <li><strong>Support:</strong> Messages and attachments you send to us when you request help.</li>
    </ul>

    <h2>Why We Process This Data</h2>
    <ul>
      <li>To provide and improve the Skip In-App service (Art. 6(1)(b) and (f) GDPR).</li>
      <li>To process payments and manage subscriptions (Art. 6(1)(b) GDPR; legitimate interests for fraud prevention, Art. 6(1)(f)).</li>
      <li>To communicate updates and respond to support (legitimate interests; consent where required).</li>
      <li>To meet legal obligations such as accounting and tax retention (Art. 6(1)(c) GDPR).</li>
      <li>To secure the service, detect abuse, and maintain reliable operation (legitimate interests).</li>
    </ul>

    <h2>Processors and Recipients</h2>
    <ul>
      <li><strong>Supabase:</strong> Authentication, database, and file storage. Hosted in EU regions where available; protected by data processing agreements and Standard Contractual Clauses when needed.</li>
      <li><strong>Stripe:</strong> Payment processing and invoicing. Stripe acts as an independent controller for some payment data. Transfers outside the EU are protected by Standard Contractual Clauses.</li>
    </ul>

    <h2>Storage and Deletion</h2>
    <ul>
      <li>Account data remains for the life of your account and is deleted within 30 days of closure unless legal retention applies.</li>
      <li>Billing and invoice records are kept for statutory retention periods (typically 6-10 years, depending on jurisdiction).</li>
      <li>Security and access logs are retained for a limited time to detect abuse and ensure stability.</li>
      <li>Support messages are kept only as long as needed to resolve the request or as required by law.</li>
    </ul>

    <h2>Security</h2>
    <p>
      Data is encrypted in transit and at rest. Access is restricted to authorized personnel. We review permissions regularly, apply security patches, and monitor for abuse.
    </p>

    <h2>Your Rights</h2>
    <ul>
      <li>Access, rectification, deletion, and restriction of processing.</li>
      <li>Data portability for data you provided on the basis of consent or contract.</li>
      <li>Objection to processing based on legitimate interests or direct marketing.</li>
      <li>Withdrawal of consent at any time without affecting prior processing.</li>
      <li>Right to lodge a complaint with your local supervisory authority.</li>
    </ul>

    <h2>Updates</h2>
    <p>
      We may update this notice when we add features or change providers. The current version is always available on this page.
    </p>
  </div>
</template>
