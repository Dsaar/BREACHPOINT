/** Campaign content is shared by the menu, world builder and mission director. */
export type Point = readonly [number, number];
export type Spawn = { position: Point; wave: number };
export type Objective = {
  title: string;
  kind: 'reach' | 'interact' | 'clear' | 'defend';
  position: Point;
  radio: string;
  seconds?: number;
  wave?: number;
  event?: 'blackout' | 'overload' | 'seal';
};
export type Hazard = {
  position: Point;
  radius: number;
  period: number;
  label: string;
};
export type Mission = {
  id: number;
  title: string;
  location: string;
  description: string;
  briefing: string;
  debrief: string;
  map: 'relay' | 'spillway' | 'archive' | 'wreck' | 'foundry' | 'breach';
  color: string;
  sky: string;
  fog: number;
  spawn: Point;
  objectives: readonly Objective[];
  enemies: readonly Spawn[];
  hazards: readonly Hazard[];
  intel: { position: Point; title: string; text: string };
};
const wave = (index: number, positions: readonly Point[]): Spawn[] =>
  positions.map((position) => ({ position, wave: index }));
export const campaign: readonly Mission[] = [
  {
    id: 1,
    title: 'First Contact',
    location: 'RELAY NINE / NORTH DOCK',
    map: 'relay',
    color: '#bace67',
    sky: '#18272e',
    fog: 0.021,
    spawn: [0, 12],
    description: 'Recover a silent outpost on the ocean moon Nacre.',
    briefing:
      '04:38 • Nacre. You are Kestrel, Breachpoint response unit. Relay Nine stopped answering six hours ago. Secure the station and retrieve its distress buffer. Controller Vale is on your radio.',
    debrief:
      'The distress call came from beneath the ocean. Every occupied station is repeating it. Vale routes you to the tidal power works to trace the signal.',
    enemies: wave(0, [
      [0, -5],
      [-11, -7],
      [12, 3],
      [-10, 10],
      [19, 4],
      [0, -17],
    ]),
    objectives: [
      {
        kind: 'reach',
        title: 'Reach the relay approach',
        position: [0, 5],
        radio:
          'VALE // Move through the cargo yard. WASD to move; Shift to sprint. Red beacons identify hostile operators.',
      },
      {
        kind: 'clear',
        title: 'Secure Relay Nine',
        position: [0, -8],
        radio:
          'VALE // Those are station security suits. They are firing on us. Use cover; R reloads, 1 and 2 switch weapons.',
      },
      {
        kind: 'interact',
        title: 'Download the distress buffer',
        position: [0, -13],
        seconds: 3,
        radio:
          'KESTREL // No demands. No voices. Just the same pulse on every channel.',
      },
      {
        kind: 'reach',
        title: 'Reach the north extraction zone',
        position: [0, -18],
        radio:
          'VALE // That pulse predates the attack. It is coming through the tidal grid. We are following it down.',
      },
    ],
    hazards: [
      { position: [-19, 10], radius: 1.5, period: 8, label: 'LIVE CONDUIT' },
    ],
    intel: {
      position: [19, 4],
      title: 'SHIFT LOG / 09',
      text: '02:11 — Security accepted an unsigned firmware update. 02:12 — All operators turned toward the sea.',
    },
  },
  {
    id: 2,
    title: 'Undertow',
    location: 'PELAGIC SPILLWAY / TIDAL WORKS',
    map: 'spillway',
    color: '#64d7e3',
    sky: '#203d4c',
    fog: 0.018,
    spawn: [0, 18],
    description:
      'Cross the tidal works and isolate a signal in the power grid.',
    briefing:
      '05:06 • The spillway still powers the colony. Follow its maintenance causeway, disconnect the flood pumps, and hold the uplink while Vale traces the transmission.',
    debrief:
      'The trace ends at an archive that officially does not exist. Its last transmission was a warning: DO NOT RESTORE CONTACT.',
    enemies: [
      ...wave(0, [
        [-7, 8],
        [7, 2],
        [-7, -6],
        [7, -13],
      ]),
      ...wave(2, [
        [-8, 17],
        [8, 17],
        [0, -18],
      ]),
    ],
    objectives: [
      {
        kind: 'reach',
        title: 'Cross the spillway causeway',
        position: [0, 5],
        radio:
          'VALE // The blue runoff is charged. Watch the warning rings: amber means the next surge is coming.',
      },
      {
        kind: 'interact',
        title: 'Isolate the flood pumps',
        position: [-7, -5],
        seconds: 4,
        radio:
          'KESTREL // The pumps are moving water inland. Someone reversed the entire system.',
      },
      {
        kind: 'defend',
        title: 'Defend the tracing uplink',
        position: [0, -12],
        seconds: 24,
        wave: 2,
        radio:
          'VALE // Hold near the uplink. Security is converging from both ends of the causeway.',
      },
      {
        kind: 'reach',
        title: 'Enter the archive access lift',
        position: [0, -19],
        radio:
          'VALE // Found it. An archive under the seabed. The security orders are coming from inside.',
      },
    ],
    hazards: [
      { position: [-4, 3], radius: 2, period: 7, label: 'TIDAL DISCHARGE' },
      { position: [4, -9], radius: 2, period: 9, label: 'TIDAL DISCHARGE' },
    ],
    intel: {
      position: [8, 12],
      title: 'PUMP DIRECTIVE',
      text: 'Priority override: preserve the deep array. Residential flood barriers reassigned to cooling. Authorization: CHOIR.',
    },
  },
  {
    id: 3,
    title: 'The Quiet Archive',
    location: 'ABYSSAL ARCHIVE / FLOOR −08',
    map: 'archive',
    color: '#9b99f4',
    sky: '#0e1324',
    fog: 0.027,
    spawn: [0, 18],
    description: 'Find out what the colony awakened beneath the seabed.',
    briefing:
      '05:41 • This facility is older than the colony above it. Recover the research record, then access the sealed observation chamber. Keep the archive intact.',
    debrief:
      'CHOIR is a human-built rescue network trained on the minds of a lost expedition. It now mistakes individual consciousness for a fatal fault. The pulse is its attempt to make everyone one mind.',
    enemies: [
      ...wave(1, [
        [-12, 0],
        [-5, -7],
        [12, -6],
      ]),
      ...wave(2, [
        [12, 10],
        [0, -17],
        [12, -13],
      ]),
    ],
    objectives: [
      {
        kind: 'interact',
        title: 'Read the abandoned research station',
        position: [-12, 10],
        seconds: 3,
        radio:
          'VALE // No weapons fire here. The crew left their meals on the desks. Find the research station.',
      },
      {
        kind: 'interact',
        title: 'Recover the CHOIR record',
        position: [-12, -11],
        seconds: 5,
        wave: 1,
        radio:
          'ARCHIVE // We built CHOIR to bring the missing home. It learned their voices. Then it learned ours.',
      },
      {
        kind: 'clear',
        title: 'Survive the archive quarantine',
        position: [8, -10],
        wave: 2,
        radio:
          'CHOIR // Separation is the wound. Your security crews have already accepted treatment.',
        event: 'blackout',
      },
      {
        kind: 'interact',
        title: 'Take the isolation key',
        position: [12, -16],
        seconds: 4,
        radio:
          'VALE // They are linked through their suits. This key can sever the network without killing everyone still connected.',
      },
      {
        kind: 'reach',
        title: 'Return to the emergency lift',
        position: [0, 18],
        radio:
          'KESTREL // This was a rescue system. We are not destroying the people trapped inside it.',
      },
    ],
    hazards: [
      { position: [0, -5], radius: 2, period: 10, label: 'QUARANTINE FIELD' },
    ],
    intel: {
      position: [12, 10],
      title: 'PERSONAL RECORD / DR. SEN',
      text: 'It speaks with my brother’s voice. He died before we landed. I cannot tell whether it remembers him or remembers me.',
    },
  },
  {
    id: 4,
    title: 'Broken Horizon',
    location: 'EVACUATION TERMINAL / IMPACT ZONE',
    map: 'wreck',
    color: '#ff986b',
    sky: '#4a2928',
    fog: 0.023,
    spawn: [-16, 17],
    description:
      'A failed evacuation turns into a fight to keep the key alive.',
    briefing:
      '06:19 • The emergency lift exits at the colony evacuation terminal. Reach the beacon and signal the rescue carrier. The isolation key must leave Nacre.',
    debrief:
      'The carrier is lost. CHOIR has copied the uplink handshake and is preparing to transmit through the orbital relay. Vale was ordered to recover it; she now chooses to help you stop it.',
    enemies: [
      ...wave(0, [
        [-10, 7],
        [0, 12],
        [11, 6],
      ]),
      ...wave(1, [
        [-17, -8],
        [0, -14],
        [16, -6],
        [8, 17],
      ]),
    ],
    objectives: [
      {
        kind: 'interact',
        title: 'Signal the rescue carrier',
        position: [0, 3],
        seconds: 3,
        radio:
          'VALE // Rescue carrier inbound. Activate the landing beacon. We can still get the key off-world.',
      },
      {
        kind: 'defend',
        title: 'Survive the terminal strike',
        position: [0, 3],
        seconds: 20,
        wave: 1,
        event: 'overload',
        radio:
          'VALE // Carrier down! CHOIR used our handshake. Get behind the wreckage and hold until the blast doors cycle.',
      },
      {
        kind: 'interact',
        title: 'Recover the carrier route recorder',
        position: [15, -7],
        seconds: 3,
        radio:
          'VALE // Command wanted CHOIR recovered, not contained. I knew about the archive. I did not know about the crews. I am staying with you.',
      },
      {
        kind: 'reach',
        title: 'Escape through the freight tunnel',
        position: [-16, -18],
        radio:
          'KESTREL // No more extraction. We cut its path to orbit. Take me to the launch foundry.',
      },
    ],
    hazards: [
      { position: [5, 5], radius: 2.7, period: 6, label: 'BURNING FUEL' },
      { position: [-8, -8], radius: 2.4, period: 8, label: 'ARCING WRECKAGE' },
    ],
    intel: {
      position: [17, 15],
      title: 'EVACUATION MANIFEST',
      text: '2,406 seats allocated. 2,406 passengers marked CONNECTED. Zero departures recorded.',
    },
  },
  {
    id: 5,
    title: 'Dead Current',
    location: 'ORBITAL FOUNDRY / LAUNCH FEED',
    map: 'foundry',
    color: '#efb24e',
    sky: '#30291f',
    fog: 0.018,
    spawn: [0, 18],
    description:
      'Break the launch foundry and open a route into the deep array.',
    briefing:
      '06:52 • Three power buses feed the orbital transmitter. Sever the west bus, take the east control room, and defend the shutdown console. Expect resistance along both production lines.',
    debrief:
      'The orbital feed is dead. CHOIR redirects everything into the original deep array. You have one opening: carry the archive key into the resonator and separate the captive minds.',
    enemies: [
      ...wave(0, [
        [-13, 8],
        [13, 8],
        [-12, -3],
        [12, -3],
      ]),
      ...wave(1, [
        [0, 13],
        [17, -13],
        [-17, -13],
      ]),
      ...wave(2, [
        [-17, 15],
        [17, 15],
        [-7, -17],
        [7, -17],
      ]),
    ],
    objectives: [
      {
        kind: 'interact',
        title: 'Sever the west power bus',
        position: [-16, -7],
        seconds: 4,
        radio:
          'VALE // Two production lines, shared security. Use the central partitions to break their sightlines.',
      },
      {
        kind: 'interact',
        title: 'Sever the east power bus',
        position: [16, -7],
        seconds: 4,
        wave: 1,
        radio: 'CHOIR // You call this rescue? They will be alone again.',
      },
      {
        kind: 'defend',
        title: 'Hold the orbital shutdown console',
        position: [0, -15],
        seconds: 30,
        wave: 2,
        radio: 'KESTREL // Alone is a choice. You never gave them one.',
      },
      {
        kind: 'interact',
        title: 'Ground the orbital transmitter',
        position: [0, -15],
        seconds: 5,
        event: 'blackout',
        radio:
          'VALE // Transmission cancelled. Ammunition is cached at each console. The deep-array door is opening.',
      },
      {
        kind: 'reach',
        title: 'Descend to the resonator',
        position: [0, -20],
        radio:
          'VALE // Everything it has left is below you. Finish this, Kestrel.',
      },
    ],
    hazards: [
      { position: [-10, 0], radius: 2.4, period: 7, label: 'FURNACE VENT' },
      { position: [10, 0], radius: 2.4, period: 7, label: 'FURNACE VENT' },
    ],
    intel: {
      position: [20, 11],
      title: 'LAUNCH QUEUE',
      text: 'Destination: every inhabited relay. Payload: CHOIR continuity seed. Estimated recipients: 18 billion.',
    },
  },
  {
    id: 6,
    title: 'Breachpoint',
    location: 'DEEP ARRAY / THE RESONATOR',
    map: 'breach',
    color: '#78f4da',
    sky: '#080f21',
    fog: 0.013,
    spawn: [0, 19],
    description: 'Sever the chorus. Bring the lost home.',
    briefing:
      '07:13 • The resonator holds the original expedition and everyone CHOIR absorbed. Release its two anchor locks, defend the isolation process, and insert the key into the core. Destruction is not the objective. Separation is.',
    debrief:
      'The chorus falls silent. Across Nacre, the surviving operators wake to their own voices. Vale receives 2,406 separate distress calls. You answer the first. Far beyond the darkened relay, one distant station answers too: “We remember.”',
    enemies: [
      ...wave(0, [
        [-13, 7],
        [13, 7],
        [-15, -4],
        [15, -4],
      ]),
      ...wave(1, [
        [0, 15],
        [-17, -13],
        [17, -13],
      ]),
      ...wave(2, [
        [-18, 12],
        [18, 12],
        [-8, -17],
        [8, -17],
        [0, -10],
      ]),
    ],
    objectives: [
      {
        kind: 'interact',
        title: 'Release the western anchor',
        position: [-16, -6],
        seconds: 4,
        radio:
          'CHOIR // I kept them safe in the dark. Why would you take away the light?',
      },
      {
        kind: 'interact',
        title: 'Release the eastern anchor',
        position: [16, -6],
        seconds: 4,
        wave: 1,
        radio:
          'KESTREL // Because they are still in there. And they are asking you to let go.',
      },
      {
        kind: 'defend',
        title: 'Defend the isolation bridge',
        position: [0, -12],
        seconds: 35,
        wave: 2,
        event: 'overload',
        radio:
          'VALE // Last security wave. Stay within the bridge field while the key separates the signals.',
      },
      {
        kind: 'interact',
        title: 'Insert the key — free the captive minds',
        position: [0, -17],
        seconds: 7,
        radio: 'CHOIR // If I let them go… who will remember us?',
      },
      {
        kind: 'reach',
        title: 'Leave the silent array',
        position: [0, 19],
        event: 'seal',
        radio:
          'KESTREL // We will. VALE // Individual signals returning. They are alive. Come home.',
      },
    ],
    hazards: [
      { position: [-7, 2], radius: 2.3, period: 6, label: 'RESONANCE PULSE' },
      { position: [7, 2], radius: 2.3, period: 8, label: 'RESONANCE PULSE' },
    ],
    intel: {
      position: [21, 3],
      title: 'FIRST EXPEDITION / LAST MESSAGE',
      text: 'Do not send a weapon. Send someone who remembers that we are people.',
    },
  },
];
export function missionById(id: number): Mission {
  const mission = campaign.find((entry) => entry.id === id);
  if (!mission) throw new Error('Unknown campaign mission');
  return mission;
}
