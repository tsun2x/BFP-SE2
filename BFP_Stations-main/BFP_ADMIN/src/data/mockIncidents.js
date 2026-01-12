/**
 * Mock Incident Data for Testing
 * Copied from Substation_admin to allow dev testing in BFP_ADMIN
 */

export const mockIncidents = [
  {
    alarmId: 1,
    firstName: "Juan",
    lastName: "Santos",
    phoneNumber: "+63-921-234-5678",
    incidentType: "Fire",
    alarmLevel: "Alarm 1",
    location: "Manila City Hall, Manila",
    narrative: "Large fire at residential building - immediate response required",
    coordinates: {
      latitude: 14.5995,
      longitude: 120.9842
    },
    status: "Pending Dispatch"
  },
  {
    alarmId: 2,
    firstName: "Maria",
    lastName: "Cruz",
    phoneNumber: "+63-917-654-3210",
    incidentType: "Medical Emergency",
    alarmLevel: "Alarm 2",
    location: "Makati Avenue, Makati City",
    narrative: "Person trapped in vehicle after accident - rescue needed",
    coordinates: {
      latitude: 14.6091,
      longitude: 120.9824
    },
    status: "Pending Dispatch"
  },
  {
    alarmId: 3,
    firstName: "Pedro",
    lastName: "Reyes",
    phoneNumber: "+63-919-876-5432",
    incidentType: "Fire",
    alarmLevel: "Alarm 1",
    location: "BGC Bonifacio Global City, Taguig",
    narrative: "Person experiencing chest pain - medical personnel standby",
    coordinates: {
      latitude: 14.5994,
      longitude: 120.9844
    },
    status: "Pending Dispatch"
  }
];

export const getRandomMockIncident = () => {
  const randomIndex = Math.floor(Math.random() * mockIncidents.length);
  return { ...mockIncidents[randomIndex], alarmId: Date.now() };
};

export const getMockIncidentByIndex = (index = 0) => {
  const idx = Math.min(index, mockIncidents.length - 1);
  return { ...mockIncidents[idx], alarmId: Date.now() };
};
