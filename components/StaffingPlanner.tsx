import React, { FC, useEffect } from 'react';
import { Box, Card, CardContent, CardHeader, Grid, TextField, Tab, Tabs, Typography, Select, MenuItem, Button, FormControl, InputLabel } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StaffingState, loadStaffingData, saveStaffingData } from '../utils/staffingStorage';
import { FileDownload } from '@mui/icons-material';

const locations = [
  { id: 'AH', name: 'Auburn Hills', code: 'C00605' },
  { id: 'SH', name: 'Shelby', code: 'C00734' },
  { id: 'OM', name: 'Oakland Mall', code: 'C00316' },
  { id: 'RH', name: 'Rochester Hills', code: 'C00195' },
  { id: 'GA', name: 'Gratiot Ave', code: 'C00954' },
  { id: 'FG', name: 'Fort Gratiot', code: 'C01107' },
  { id: 'WA', name: 'Warren', code: 'C01142' }
];

const staffTypes = ['Server', 'Bartender', 'Host', 'Busser', 'Runner', 'Togo', 'QA'];
const daysOfWeek = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];

const staffTypeConfig: Record<string, { divisor: number }> = {
  Server: { divisor: 4.5 },
  Bartender: { divisor: 4.0 },
  Host: { divisor: 4.5 },
  Busser: { divisor: 4.0 },
  Runner: { divisor: 4.0 },
  Togo: { divisor: 4.0 },
  QA: { divisor: 4.0 }
};

const initialShiftState = {
  lunch: 0,
  dinner: 0
};

const initialStaffingState: StaffingState = Object.fromEntries(
  staffTypes.map(role => [
    role,
    {
      shifts: Object.fromEntries(
        daysOfWeek.map(day => [day, { ...initialShiftState }])
      ),
      onHand: 0,
      totalShifts: 0,
      staffingNeeds: 0,
      hiringNeeds: 0
    }
  ])
);

const StaffingPlanner: FC = () => {
  const [staffing, setStaffing] = React.useState<StaffingState>(initialStaffingState);
  const [activeTab, setActiveTab] = React.useState(staffTypes[0]);
  const [selectedLocation, setSelectedLocation] = React.useState(locations[0]);

  useEffect(() => {
    const savedData = loadStaffingData();
    if (savedData) {
      setStaffing(savedData);
    }
  }, []);

  useEffect(() => {
    saveStaffingData(staffing);
  }, [staffing]);

  const calculateMetrics = (
    role: string,
    shifts: Record<string, { lunch: number; dinner: number }>,
    onHand: number
  ) => {
    const totalShifts = Object.values(shifts).reduce(
      (sum, dayShifts) => sum + dayShifts.lunch + dayShifts.dinner,
      0
    );
    const staffingNeeds = +(totalShifts / staffTypeConfig[role].divisor).toFixed(1);
    const hiringNeeds = Math.max(0, +(staffingNeeds - onHand).toFixed(1));
    return { totalShifts, staffingNeeds, hiringNeeds };
  };

  const handleShiftChange = (role: string, day: string, shift: 'lunch' | 'dinner', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(numValue)) return;

    const newStaffing = {
      ...staffing,
      [role]: {
        ...staffing[role],
        shifts: {
          ...staffing[role].shifts,
          [day]: {
            ...staffing[role].shifts[day],
            [shift]: numValue
          }
        }
      }
    };
    
    const metrics = calculateMetrics(
      role,
      newStaffing[role].shifts,
      newStaffing[role].onHand
    );
    
    newStaffing[role] = {
      ...newStaffing[role],
      ...metrics
    };
    
    setStaffing(newStaffing);
  };

  const handleOnHandChange = (role: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(numValue)) return;

    const newStaffing = {
      ...staffing,
      [role]: {
        ...staffing[role],
        onHand: numValue
      }
    };
    
    const metrics = calculateMetrics(
      role,
      newStaffing[role].shifts,
      numValue
    );
    
    newStaffing[role] = {
      ...newStaffing[role],
      ...metrics
    };
    
    setStaffing(newStaffing);
  };

  const getChartData = () => {
    return Object.entries(staffing).map(([name, data]) => ({
      name,
      Current: data.onHand,
      Needed: data.staffingNeeds
    }));
  };

  const exportToCSV = () => {
    let csvContent = "Location,Role,Day,Lunch Shifts,Dinner Shifts,Total Shifts,Staff On Hand,Staffing Needs,Hiring Needs\n";
    
    Object.entries(staffing).forEach(([role, data]) => {
      Object.entries(data.shifts).forEach(([day, shifts]) => {
        csvContent += `${selectedLocation.name},${role},${day},${shifts.lunch},${shifts.dinner},${data.totalShifts},${data.onHand},${data.staffingNeeds},${data.hiringNeeds}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staffing-needs-${selectedLocation.id}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ 
      maxWidth: 1400, 
      margin: '0 auto', 
      padding: 3,
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocation.id}
                  label="Location"
                  onChange={(e) => setSelectedLocation(locations.find(loc => loc.id === e.target.value) || locations[0])}
                >
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name} - {loc.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1">Current Date: {new Date().toLocaleDateString()}</Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
              <Button 
                variant="contained" 
                startIcon={<FileDownload />}
                onClick={exportToCSV}
                sx={{ 
                  backgroundColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#115293'
                  }
                }}
              >
                Export Data
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3 }}>
            <CardHeader 
              title={`${selectedLocation.name} Details`}
              sx={{ backgroundColor: '#f8f8f8', borderBottom: '1px solid #eee' }}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" color="textSecondary">Location Code:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>{selectedLocation.code}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" color="textSecondary">Date:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>{new Date().toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" color="textSecondary">Weekly Sales:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>$100,000</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3 }}>
            <CardHeader 
              title="Staffing Overview" 
              sx={{ backgroundColor: '#f8f8f8', borderBottom: '1px solid #eee' }}
            />
            <CardContent>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Current" fill="#4CAF50" name="Current Staff" />
                    <Bar dataKey="Needed" fill="#2196F3" name="Needed Staff" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3, boxShadow: 3 }}>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 2
            }}
          >
            {staffTypes.map((type) => (
              <Tab 
                key={type} 
                label={type} 
                value={type}
                sx={{
                  '&.Mui-selected': {
                    color: '#1976d2',
                    fontWeight: 'bold'
                  }
                }}
              />
            ))}
          </Tabs>

          <Grid container spacing={3}>
            {daysOfWeek.map((day) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={day}>
                <Card sx={{ p: 2, boxShadow: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>{day}</Typography>
                  <TextField
                    label="Lunch Shifts"
                    type="number"
                    value={staffing[activeTab].shifts[day].lunch}
                    onChange={(e) => handleShiftChange(activeTab, day, 'lunch', e.target.value)}
                    fullWidth
                    margin="normal"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Dinner Shifts"
                    type="number"
                    value={staffing[activeTab].shifts[day].dinner}
                    onChange={(e) => handleShiftChange(activeTab, day, 'dinner', e.target.value)}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, boxShadow: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Total Shifts</Typography>
                <TextField
                  type="number"
                  value={staffing[activeTab].totalShifts}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                />
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, boxShadow: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Staffing Needs</Typography>
                <TextField
                  type="number"
                  value={staffing[activeTab].staffingNeeds}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                />
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, boxShadow: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Staff On Hand</Typography>
                <TextField
                  type="number"
                  value={staffing[activeTab].onHand}
                  onChange={(e) => handleOnHandChange(activeTab, e.target.value)}
                  fullWidth
                  size="small"
                />
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, boxShadow: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Hiring Needs</Typography>
                <TextField
                  type="number"
                  value={staffing[activeTab].hiringNeeds}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                />
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StaffingPlanner;