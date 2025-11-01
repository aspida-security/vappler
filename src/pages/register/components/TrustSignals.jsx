import React from 'react';
import Icon from '../../../components/AppIcon';

const TrustSignals = () => {
  const certifications = [
    {
      name: 'SOC 2 Type II',
      icon: 'Shield',
      description: 'Security & availability controls'
    },
    {
      name: 'ISO 27001',
      icon: 'Award',
      description: 'Information security management'
    },
    {
      name: 'GDPR Compliant',
      icon: 'Lock',
      description: 'Data protection & privacy'
    },
    {
      name: 'SSL Encrypted',
      icon: 'Key',
      description: 'End-to-end encryption'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Senior Security Consultant',
      company: 'CyberGuard Solutions',
      content: `Vappler replaced our expensive Nessus Pro subscription and delivers the same professional results. The client reporting features are outstanding.`,
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'Penetration Tester',
      company: 'SecureNet Consulting',
      content: `Finally, a vulnerability scanner built for consultants. The multi-tenant workspace management is exactly what we needed for our SMB clients.`,
      rating: 5
    },
    {
      name: 'Jennifer Walsh',
      role: 'MSSP Owner',
      company: 'TechSecure Partners',
      content: `Cut our scanning costs by 80% while improving our service delivery. The automated reporting saves us hours every week.`,
      rating: 5
    }
  ];

  const stats = [
    { value: '10,000+', label: 'Security Professionals' },
    { value: '50,000+', label: 'Vulnerabilities Detected' },
    { value: '99.9%', label: 'Platform Uptime' },
    { value: '24/7', label: 'Expert Support' }
  ];

  return (
    <div className="space-y-8">
      {/* Security Certifications */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Security & Compliance</h3>
        <div className="grid grid-cols-2 gap-4">
          {certifications?.map((cert, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                <Icon name={cert?.icon} size={16} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{cert?.name}</div>
                <div className="text-xs text-muted-foreground">{cert?.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Platform Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Trusted by Professionals</h3>
        <div className="grid grid-cols-2 gap-4">
          {stats?.map((stat, index) => (
            <div key={index} className="text-center p-4 bg-card border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">{stat?.value}</div>
              <div className="text-sm text-muted-foreground">{stat?.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Customer Testimonials */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">What Security Professionals Say</h3>
        <div className="space-y-4">
          {testimonials?.map((testimonial, index) => (
            <div key={index} className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center space-x-1 mb-2">
                {[...Array(testimonial?.rating)]?.map((_, i) => (
                  <Icon key={i} name="Star" size={14} className="text-warning fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-3 italic">
                "{testimonial?.content}"
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <Icon name="User" size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{testimonial?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial?.role} at {testimonial?.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Security Badge */}
      <div className="text-center p-6 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-3">
          <Icon name="ShieldCheck" size={24} className="text-primary" />
        </div>
        <h4 className="text-lg font-semibold text-foreground mb-2">Enterprise-Grade Security</h4>
        <p className="text-sm text-muted-foreground">
          Your data is protected with bank-level encryption and security controls trusted by cybersecurity professionals worldwide.
        </p>
      </div>
    </div>
  );
};

export default TrustSignals;