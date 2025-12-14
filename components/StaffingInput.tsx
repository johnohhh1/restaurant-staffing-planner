
import React, { ChangeEvent } from 'react';
import { Input, InputProps } from '@mui/material';

interface StaffingInputProps extends InputProps {
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  min?: number;
}

const StaffingInput: React.FC<StaffingInputProps> = ({
  value,
  onChange,
  min = 0,
  ...props
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue === '' || (min !== undefined && parseInt(newValue, 10) >= min)) {
      onChange(e);
    }
  };

  return <Input value={value} onChange={handleChange} {...props} />;
};

export default StaffingInput;