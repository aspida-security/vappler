import React from 'react';
import * as LucideIcons from 'lucide-react';
import { HelpCircle } from 'lucide-react';

/**
 * Icon Component - Dynamic Lucide React icon renderer
 * 
 * Props:
 * - name (string): Lucide icon name in PascalCase (e.g., 'Table', 'BarChart2', 'Download')
 * - size (number): Icon size in pixels (default: 24)
 * - color (string): Icon color (default: 'currentColor')
 * - className (string): Additional CSS classes (e.g., 'w-4 h-4 text-blue-500')
 * - strokeWidth (number): SVG stroke width (default: 2)
 * - ...props: Any other valid SVG attributes
 * 
 * Examples:
 * <Icon name="Table" size={24} />
 * <Icon name="BarChart2" className="w-4 h-4 text-primary" />
 * <Icon name="Download" size={20} color="#3B82F6" />
 * <Icon name="AlertTriangle" className="text-error" />
 */
function Icon({
  name,
  size = 24,
  color = 'currentColor',
  className = '',
  strokeWidth = 2,
  ...props
}) {
  // Get the icon component from lucide-react by name
  const IconComponent = LucideIcons?.[name];

  // If icon doesn't exist, show a HelpCircle placeholder
  if (!IconComponent) {
    console.warn(
      `Icon "${name}" not found in lucide-react. Check the icon name is correct and in PascalCase.`
    );
    return (
      <HelpCircle
        size={size}
        color={color}
        className={className}
        strokeWidth={strokeWidth}
        {...props}
      />
    );
  }

  // Render the requested icon with all props
  return (
    <IconComponent
      size={size}
      color={color}
      className={className}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}

Icon.displayName = 'Icon';

export default Icon;
