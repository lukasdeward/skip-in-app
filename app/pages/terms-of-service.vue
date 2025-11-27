<script setup lang="ts">
useSeoMeta({
  title: 'Terms of Service',
  description: 'The terms that govern your use of Skip In-App.'
})
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 mb-10 prose prose-neutral">
    <h1>Terms of Service</h1>
    <p>
      These terms explain how you may use Skip In-App. By creating an account or accessing the
      product, you agree to them. If you are using Skip In-App on behalf of a company, you confirm
      you have authority to accept these terms for that company.
    </p>

    <h2>Using Skip In-App</h2>
    <ul>
      <li>You must provide accurate account information and keep your credentials secure.</li>
      <li>You will not attempt to disrupt the service, misuse integrations, or access data you do not own.</li>
      <li>We may update features and interfaces; material changes to these terms will be announced.</li>
    </ul>

    <h2>Subscriptions and Billing</h2>
    <ul>
      <li>Paid plans renew automatically unless canceled before the renewal date.</li>
      <li>Invoices and payment processing are handled by Stripe; applicable taxes may be added.</li>
      <li>We may suspend service for unpaid invoices or repeated failed payments.</li>
    </ul>

    <h2>Data and Privacy</h2>
    <p>
      How we collect, use, and protect data is described in our
      <NuxtLink to="/data-protection">Data Protection</NuxtLink> notice. By using Skip In-App you
      agree to that notice.
    </p>

    <h2>Availability and Support</h2>
    <ul>
      <li>We aim for high availability but do not guarantee uninterrupted service.</li>
      <li>Support is provided via the channels listed in the product; response times are not guaranteed.</li>
    </ul>

    <h2>Termination</h2>
    <ul>
      <li>You may cancel at any time in your account settings; access continues until the end of the current term.</li>
      <li>We may suspend or end access for violations of these terms or legal requirements.</li>
    </ul>

    <h2>Liability</h2>
    <p>
      To the extent permitted by law, Skip In-App is provided “as is” and our liability is limited to
      the fees you paid in the three months before the claim. We are not liable for indirect,
      incidental, or consequential damages.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about these terms? Email <a href="mailto:support@skip-in.app">support@skip-in.app</a>.
    </p>
  </div>
</template>
