import React, { FC, useEffect } from 'react';
import { Box, Card, CardContent, CardHeader, Grid, TextField, Typography, Select, MenuItem, Button, FormControl, InputLabel, Slider, Paper, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch, FormControlLabel } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StaffingState, loadAppState, saveAppState } from '../utils/staffingStorage';
import { FileDownload, TrendingUp, TrendingDown, People, Brightness4, Brightness7 } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

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
  const [selectedLocation, setSelectedLocation] = React.useState(locations[0]);
  const [volume, setVolume] = React.useState(100);
  const [darkMode, setDarkMode] = React.useState(true);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#4a9eff',
      },
      background: {
        default: darkMode ? '#0f1419' : '#f5f5f5',
        paper: darkMode ? '#1a1f2e' : '#ffffff',
      },
    },
  });

  useEffect(() => {
    const savedState = loadAppState();
    if (savedState) {
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        maxWidth: 1600,
        margin: '0 auto',
        padding: 3,
        minHeight: '100vh'
      }}>
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardHeader
            title="📊 Woods Area Staffing Planner"
            sx={{
              backgroundColor: darkMode ? '#1a1f2e' : '#f5f5f5',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          />
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
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
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1">Date: {new Date().toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
                  label={darkMode ? <Brightness4 /> : <Brightness7 />}
                />
              </Grid>
              <Grid item xs={12} md={3} sx={{ textAlign: 'right' }}>
                <Button
                  variant="contained"
                  startIcon={<FileDownload />}
                  onClick={exportToCSV}
                >
                  Export Data
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, boxShadow: 3, border: '2px solid #4a9eff' }}>
          <CardHeader
            title="Volume Control"
            sx={{
              backgroundColor: '#4a9eff',
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
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardHeader
            title="Staffing Summary - All Positions"
            avatar={<People sx={{ fontSize: 32 }} />}
          />
          <CardContent>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e3f2fd', border: '1px solid #2196F3' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {getTotalStaffingNeeds().toFixed(1)}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">Total Needed</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9', border: '1px solid #4CAF50' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {getTotalOnHand()}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">On Hand</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: getTotalHiringNeeds() > 0 ? '#ffebee' : '#f1f8e9', border: getTotalHiringNeeds() > 0 ? '1px solid #f44336' : '1px solid #8bc34a' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: getTotalHiringNeeds() > 0 ? '#c62828' : '#558b2f' }}>
                    {getTotalHiringNeeds() > 0 ? getTotalHiringNeeds().toFixed(1) : '✓'}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    {getTotalHiringNeeds() > 0 ? 'Need to Hire' : 'Fully Staffed'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardHeader title="All Positions - Weekly Shift Planning" />
          <CardContent>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Position</TableCell>
                    {daysOfWeek.map(day => (
                      <TableCell key={day} sx={{ fontWeight: 'bold', color: 'white', fontSize: '0.75rem' }}>{day}</TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Total Shifts</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>On Hand</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Needed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>To Hire</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staffTypes.map((role) => (
                    <TableRow key={role} hover>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>{role}</TableCell>
                      {daysOfWeek.map(day => (
                        <TableCell key={day} sx={{ padding: '4px' }}>
                          <TextField
                            type="number"
                            size="small"
                            value={staffing[role].shifts[day].lunch + staffing[role].shifts[day].dinner}
                            onChange={(e) => {
                              const total = parseInt(e.target.value) || 0;
                              handleShiftChange(role, day, 'lunch', String(total));
                              handleShiftChange(role, day, 'dinner', '0');
                            }}
                            sx={{ width: 60 }}
                            InputProps={{
                              inputProps: { min: 0, style: { textAlign: 'center', padding: '6px' } }
                            }}
                          />
                        </TableCell>
                      ))}
                      <TableCell sx={{ fontWeight: 'bold' }}>{staffing[role].totalShifts}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={staffing[role].onHand}
                          onChange={(e) => handleOnHandChange(role, e.target.value)}
                          sx={{ width: 70 }}
                          InputProps={{
                            inputProps: { min: 0, style: { textAlign: 'center', padding: '6px' } }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {staffing[role].staffingNeeds}
                      </TableCell>
                      <TableCell sx={{
                        fontWeight: 'bold',
                        color: staffing[role].hiringNeeds > 0 ? '#d32f2f' : '#2e7d32',
                        fontSize: '1.1rem'
                      }}>
                        {staffing[role].hiringNeeds > 0 ? staffing[role].hiringNeeds : '✓'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ boxShadow: 3 }}>
              <CardHeader title="Staffing Overview Chart" />
              <CardContent>
                <Box sx={{ height: 400 }}>
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

        <Box sx={{
          textAlign: 'center',
          padding: '30px 20px',
          mt: 5,
          borderTop: '1px solid',
          borderColor: 'divider',
          color: 'text.secondary',
          fontSize: '13px'
        }}>
          Copyright © 2026 John Olenski •{' '}
          <Typography component="a" href="https://johnohhh1.dev" target="_blank" sx={{
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { opacity: 0.7 }
          }}>
            johnohhh1.dev
          </Typography>
          <br />
          <Typography sx={{ fontSize: '11px', opacity: 0.7, mt: 0.5 }}>
            For authorized use only. Redistribution prohibited without permission.
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default StaffingPlanner;
