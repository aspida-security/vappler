import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AddClientModal = ({ isOpen, onClose, onAddClient }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    industry: '',
    contactEmail: '',
    contactPhone: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const industryOptions = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Financial Services' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'retail', label: 'Retail & E-commerce' },
    { value: 'education', label: 'Education' },
    { value: 'government', label: 'Government' },
    { value: 'nonprofit', label: 'Non-profit' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData?.clientName?.trim()) {
      newErrors.clientName = 'Client name is required';
    }
    
    if (!formData?.industry) {
      newErrors.industry = 'Industry selection is required';
    }
    
    if (!formData?.contactEmail?.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/?.test(formData?.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newClient = {
        id: Date.now()?.toString(),
        ...formData,
        assetCount: 0,
        riskScore: 0,
        criticalVulns: 0,
        highVulns: 0,
        mediumVulns: 0,
        lowVulns: 0,
        lastScanDate: new Date()?.toISOString(),
        isActive: false,
        createdAt: new Date()?.toISOString()
      };
      
      onAddClient(newClient);
      
      // Reset form
      setFormData({
        clientName: '',
        industry: '',
        contactEmail: '',
        contactPhone: '',
        description: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Error adding client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-elevation-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">
              Add New Client
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Client Name"
              type="text"
              placeholder="Enter client company name"
              value={formData?.clientName}
              onChange={(e) => handleInputChange('clientName', e?.target?.value)}
              error={errors?.clientName}
              required
            />
            
            <Select
              label="Industry"
              placeholder="Select industry"
              options={industryOptions}
              value={formData?.industry}
              onChange={(value) => handleInputChange('industry', value)}
              error={errors?.industry}
              required
              searchable
            />
            
            <Input
              label="Contact Email"
              type="email"
              placeholder="contact@client.com"
              value={formData?.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e?.target?.value)}
              error={errors?.contactEmail}
              required
            />
            
            <Input
              label="Contact Phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData?.contactPhone}
              onChange={(e) => handleInputChange('contactPhone', e?.target?.value)}
              error={errors?.contactPhone}
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                rows={3}
                placeholder="Brief description of the client and their requirements..."
                value={formData?.description}
                onChange={(e) => handleInputChange('description', e?.target?.value)}
              />
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                loading={isSubmitting}
                iconName="Plus"
                iconPosition="left"
              >
                Add Client
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddClientModal;