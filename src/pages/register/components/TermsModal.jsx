import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const TermsModal = ({ isOpen, onClose, type = 'terms' }) => {
  if (!isOpen) return null;

  const isTerms = type === 'terms';
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';

  const termsContent = `
VULCAN SCAN TERMS OF SERVICE

Last Updated: September 29, 2025

1. ACCEPTANCE OF TERMS
By accessing and using Vulcan Scan ("Service"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.

2. DESCRIPTION OF SERVICE
Vulcan Scan is a vulnerability management and cybersecurity scanning platform designed for security consultants and Managed Security Service Providers (MSSPs). The Service provides network discovery, vulnerability scanning, reporting, and management capabilities.

3. USER ACCOUNTS AND REGISTRATION
3.1 You must provide accurate, current, and complete information during registration
3.2 You are responsible for maintaining the confidentiality of your account credentials
3.3 You agree to notify us immediately of any unauthorized use of your account
3.4 One person or entity may not maintain more than one account

4. ACCEPTABLE USE POLICY
4.1 You may only scan networks and systems you own or have explicit written permission to test
4.2 You agree not to use the Service for any illegal or unauthorized purpose
4.3 You will not attempt to gain unauthorized access to any systems or networks
4.4 You will comply with all applicable laws and regulations

5. DATA AND PRIVACY
5.1 We collect and process data as described in our Privacy Policy
5.2 You retain ownership of your scan data and vulnerability reports
5.3 We implement industry-standard security measures to protect your data
5.4 You are responsible for the security of systems you scan

6. SERVICE AVAILABILITY
6.1 We strive to maintain 99.9% uptime but do not guarantee uninterrupted service
6.2 We may perform maintenance that temporarily affects service availability
6.3 We are not liable for any downtime or service interruptions

7. INTELLECTUAL PROPERTY
7.1 The Service and its content are protected by intellectual property laws
7.2 You may not copy, modify, or distribute our proprietary technology
7.3 You grant us a license to use your feedback to improve the Service

8. LIMITATION OF LIABILITY
8.1 We are not liable for any indirect, incidental, or consequential damages
8.2 Our total liability is limited to the amount you paid for the Service
8.3 You use the Service at your own risk

9. TERMINATION
9.1 Either party may terminate this agreement at any time
9.2 We may suspend or terminate accounts that violate these Terms
9.3 Upon termination, you may export your data for 30 days

10. GOVERNING LAW
These Terms are governed by the laws of the United States and the State of Delaware.

11. CHANGES TO TERMS
We may modify these Terms at any time. Continued use constitutes acceptance of modified Terms.

For questions about these Terms, contact us at legal@vulcanscan.com
  `;

  const privacyContent = `
VULCAN SCAN PRIVACY POLICY

Last Updated: September 29, 2025

1. INFORMATION WE COLLECT
1.1 Account Information: Name, email, company details, and contact information
1.2 Usage Data: How you interact with our Service, including scan configurations and results
1.3 Technical Data: IP addresses, browser information, and device identifiers
1.4 Scan Data: Network information, vulnerability findings, and security assessments

2. HOW WE USE YOUR INFORMATION
2.1 To provide and improve our vulnerability scanning services
2.2 To communicate with you about your account and our services
2.3 To ensure platform security and prevent unauthorized access
2.4 To comply with legal obligations and enforce our Terms of Service

3. INFORMATION SHARING
3.1 We do not sell, rent, or trade your personal information
3.2 We may share information with service providers who assist in platform operations
3.3 We may disclose information if required by law or to protect our rights
3.4 Your scan data remains confidential and is never shared with third parties

4. DATA SECURITY
4.1 We implement industry-standard encryption and security measures
4.2 All data transmission is protected using SSL/TLS encryption
4.3 We maintain SOC 2 Type II and ISO 27001 certifications
4.4 Regular security audits ensure ongoing protection of your data

5. DATA RETENTION
5.1 Account information is retained while your account is active
5.2 Scan data is retained according to your subscription plan
5.3 You may request deletion of your data at any time
5.4 Some information may be retained for legal compliance purposes

6. YOUR RIGHTS
6.1 Access: You can access your personal information at any time
6.2 Correction: You can update or correct your information
6.3 Deletion: You can request deletion of your personal information
6.4 Portability: You can export your data in standard formats

7. COOKIES AND TRACKING
7.1 We use cookies to improve your experience and platform functionality
7.2 You can control cookie settings through your browser
7.3 Some features may not work properly if cookies are disabled
7.4 We do not use cookies for advertising or tracking across other websites

8. INTERNATIONAL DATA TRANSFERS
8.1 Your data may be processed in countries outside your residence
8.2 We ensure appropriate safeguards for international data transfers
8.3 We comply with applicable data protection laws and regulations

9. CHILDREN'S PRIVACY
Our Service is not intended for children under 13. We do not knowingly collect information from children under 13.

10. CHANGES TO THIS POLICY
We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notifications.

11. CONTACT INFORMATION
For privacy-related questions or requests, contact us at:
Email: privacy@vulcanscan.com
Address: Vulcan Scan Privacy Office, 123 Security Blvd, Cyber City, CC 12345

Data Protection Officer: dpo@vulcanscan.com
  `;

  const content = isTerms ? termsContent : privacyContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-card border border-border rounded-lg shadow-elevation-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <Icon name="X" size={20} />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
              {content}
            </pre>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-border">
          <Button
            variant="default"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;