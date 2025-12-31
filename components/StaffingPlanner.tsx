import React, { FC, useEffect } from 'react';
import { Box, Card, CardContent, CardHeader, Grid, TextField, Tab, Tabs, Typography, Select, MenuItem, Button, FormControl, InputLabel, Slider, Paper, Chip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StaffingState, loadAppState, saveAppState } from '../utils/staffingStorage';
import { FileDownload, TrendingUp, TrendingDown, People } from '@mui/icons-material';

const locations = [
  { id: 'AH', name: 'Auburn Hills', code: 'C00605' },
  { id: 'SH', name: 'Shelby', code: 'C00734' },
  { id: 'OM', name: 'Oakland Mall', code: 'C00316' },
  { id: 'RH', name: 'Rochester Hills', code: 'C00195' },
  { id: 'GA', name: 'Gratiot Ave', code: 'C00954' },
  { id: 'FG', name: 'Fort Gratiot', code: 'C01107' },
  { id: 'WA', name: 'Warren', code: 'C01142' }
];

const staffTypes = ['Server', 'Bartender', 'Host', 'Busser', 'Runner', 'Togo', 'QA', 'Cook', 'Dishwasher', 'Night Cleaner'];
const daysOfWeek = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];

const staffTypeConfig: Record<string, { divisor: number }> = {
  Server: { divisor: 4.5 },
  Bartender: { divisor: 4.0 },
  Host: { divisor: 4.5 },
  Busser: { divisor: 4.0 },
  Runner: { divisor: 4.0 },
  Togo: { divisor: 4.0 },
  QA: { divisor: 4.0 },
  Cook: { divisor: 4.0 },
  Dishwasher: { divisor: 4.0 },
  'Night Cleaner': { divisor: 4.5 }
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
  const [volume, setVolume] = React.useState(100);

  useEffect(() => {
    const savedState = loadAppState();
    if (savedState) {
      // Merge saved state with initial state to include any new roles
      const mergedStaffing = {
        ...initialStaffingState,
        ...savedState.staffing
      };
      setStaffing(mergedStaffing);
      setVolume(savedState.volume);
    }
  }, []);

  useEffect(() => {
    saveAppState({ staffing, volume });
  }, [staffing, volume]);

  const calculateMetrics = (
    role: string,
    shifts: Record<string, { lunch: number; dinner: number }>,
    onHand: number,
    volumeMultiplier: number = 1
  ) => {
    const totalShifts = Object.values(shifts).reduce(
      (sum, dayShifts) => sum + dayShifts.lunch + dayShifts.dinner,
      0
    );
    const baseStaffingNeeds = totalShifts / staffTypeConfig[role].divisor;
    const staffingNeeds = +(baseStaffingNeeds * volumeMultiplier).toFixed(1);
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
      newStaffing[role].onHand,
      volume / 100
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
      numValue,
      volume / 100
    );

    newStaffing[role] = {
      ...newStaffing[role],
      ...metrics
    };

    setStaffing(newStaffing);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);

    const newStaffing = { ...staffing };
    Object.keys(newStaffing).forEach(role => {
      const metrics = calculateMetrics(
        role,
        newStaffing[role].shifts,
        newStaffing[role].onHand,
        newVolume / 100
      );
      newStaffing[role] = {
        ...newStaffing[role],
        ...metrics
      };
    });

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

  const getTotalStaffingNeeds = () => {
    return Object.values(staffing).reduce((sum, data) => sum + data.staffingNeeds, 0);
  };

  const getTotalOnHand = () => {
    return Object.values(staffing).reduce((sum, data) => sum + data.onHand, 0);
  };

  const getTotalHiringNeeds = () => {
    return Object.values(staffing).reduce((sum, data) => sum + data.hiringNeeds, 0);
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

      <Card sx={{ mb: 3, boxShadow: 3, border: '2px solid #1976d2' }}>
        <CardHeader
          title="Restaurant Volume Control"
          sx={{
            backgroundColor: '#1976d2',
            color: 'white',
            '& .MuiCardHeader-title': {
              fontSize: '1.25rem',
              fontWeight: 'bold'
            }
          }}
        />
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                Volume Multiplier: {volume}%
                {volume > 100 && <Chip label="BUSY" color="error" size="small" sx={{ ml: 1 }} />}
                {volume < 100 && <Chip label="SLOW" color="info" size="small" sx={{ ml: 1 }} />}
                {volume === 100 && <Chip label="NORMAL" color="success" size="small" sx={{ ml: 1 }} />}
              </Typography>
              <Slider
                value={volume}
                onChange={(_, value) => handleVolumeChange(value as number)}
                min={25}
                max={200}
                step={5}
                marks={[
                  { value: 25, label: '25%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                  { value: 150, label: '150%' },
                  { value: 200, label: '200%' }
                ]}
                valueLabelDisplay="auto"
                sx={{
                  color: volume > 100 ? '#d32f2f' : volume < 100 ? '#0288d1' : '#2e7d32',
                  '& .MuiSlider-thumb': {
                    width: 20,
                    height: 20
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Custom Volume %"
                type="number"
                value={volume}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 25 && val <= 200) {
                    handleVolumeChange(val);
                  }
                }}
                fullWidth
                InputProps={{
                  inputProps: { min: 25, max: 200, step: 5 }
                }}
              />
            </Grid>
          </Grid>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            Adjust the volume to see how staffing needs change based on restaurant traffic. 100% = normal volume.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardHeader
          title="Staffing Summary - All Positions"
          avatar={<People sx={{ fontSize: 32 }} />}
          sx={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #1976d2' }}
        />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e3f2fd', border: '1px solid #2196F3' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {getTotalStaffingNeeds().toFixed(1)}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">Total Team Members Needed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9', border: '1px solid #4CAF50' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  {getTotalOnHand()}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">Current Team Members</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: getTotalHiringNeeds() > 0 ? '#ffebee' : '#f1f8e9', border: getTotalHiringNeeds() > 0 ? '1px solid #f44336' : '1px solid #8bc34a' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: getTotalHiringNeeds() > 0 ? '#c62828' : '#558b2f' }}>
                  {getTotalHiringNeeds() > 0 ? (
                    <>
                      <TrendingUp sx={{ fontSize: 32, verticalAlign: 'middle', mr: 1 }} />
                      {getTotalHiringNeeds().toFixed(1)}
                    </>
                  ) : (
                    <>
                      <TrendingDown sx={{ fontSize: 32, verticalAlign: 'middle', mr: 1, color: '#558b2f' }} />
                      Fully Staffed
                    </>
                  )}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  {getTotalHiringNeeds() > 0 ? 'Need to Hire' : 'Hiring Status'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
            Breakdown by Position:
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(staffing).map(([role, data]) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={role}>
                <Paper
                  sx={{
                    p: 2,
                    border: data.hiringNeeds > 0 ? '2px solid #f44336' : '1px solid #e0e0e0',
                    backgroundColor: data.hiringNeeds > 0 ? '#fff3f3' : 'white'
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
                    {role}
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Needed:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {data.staffingNeeds}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">On Hand:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body1">{data.onHand}</Typography>
                    </Grid>
                    {data.hiringNeeds > 0 && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                            To Hire:
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body1" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                            {data.hiringNeeds}
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            ))}
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