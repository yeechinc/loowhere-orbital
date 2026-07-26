import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import HomeScreen from '../app/index';
import { supabase } from '../../supabaseConfig';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 1.35, longitude: 103.8 } })),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return <View>{props.children}</View>;
  });
  return { __esModule: true, default: MockMapView, Marker: () => null };
});

jest.mock('../../supabaseConfig', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

function createChain(resolvedValue: any) {
  const chain: any = {};
  ['select', 'eq', 'order', 'update', 'insert', 'delete'].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => Promise.resolve(resolvedValue));
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return chain;
}

function setupSupabaseMock() {
  const tableResponses: Record<string, any> = {
    toilets: createChain({ data: [], error: null }),
    reviews: createChain({ data: [] }),
    saved_toilets: createChain({ data: [] }),
    toilet_photos: createChain({ data: [] }),
    user_points: createChain({ data: null }),
  };
  (supabase.from as jest.Mock).mockImplementation((table: string) => tableResponses[table]);
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: 'user1', user_metadata: { display_name: 'Tester' } } },
  });
  return tableResponses;
}

const testToilet = {
  name: 'Test Loo',
  address: '123 Clementi Ave',
  latitude: 1.3,
  longitude: 103.8,
  has_bidet: false,
  has_paper: false,
  handicapped_access: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

test('shows the refill prompt when the selected toilet has no paper', async () => {
  setupSupabaseMock();
  render(<HomeScreen preSelectedToilet={testToilet} onPreSelectedConsumed={jest.fn()} />);

  expect(await screen.findByText('🧻 Has toilet paper been refilled?')).toBeVisible();
});

test('does not show the refill prompt when the toilet already has paper', async () => {
  setupSupabaseMock();
  render(
    <HomeScreen
      preSelectedToilet={{ ...testToilet, has_paper: true }}
      onPreSelectedConsumed={jest.fn()}
    />
  );

  await screen.findByText('Test Loo');
  expect(screen.queryByText('🧻 Has toilet paper been refilled?')).toBeNull();
});

test('tapping Yes updates has_paper in Supabase, awards points, and hides the prompt', async () => {
  const tableResponses = setupSupabaseMock();
  render(<HomeScreen preSelectedToilet={testToilet} onPreSelectedConsumed={jest.fn()} />);

  await screen.findByText('🧻 Has toilet paper been refilled?');
  fireEvent.press(screen.getByText('Yes!'));

  await waitFor(() => {
    expect(tableResponses.toilets.update).toHaveBeenCalledWith({ has_paper: true });
  });
  expect(tableResponses.toilets.eq).toHaveBeenCalledWith('name', 'Test Loo');

  await waitFor(() => {
    expect(tableResponses.user_points.insert).toHaveBeenCalledWith({ user_id: 'user1', points: 2 });
  });

  await waitFor(() => {
    expect(screen.queryByText('🧻 Has toilet paper been refilled?')).toBeNull();
  });
});

test('tapping No hides the prompt without updating has_paper', async () => {
  const tableResponses = setupSupabaseMock();
  render(<HomeScreen preSelectedToilet={testToilet} onPreSelectedConsumed={jest.fn()} />);

  await screen.findByText('🧻 Has toilet paper been refilled?');
  fireEvent.press(screen.getByText('No'));

  await waitFor(() => {
    expect(screen.queryByText('🧻 Has toilet paper been refilled?')).toBeNull();
  });
  expect(tableResponses.toilets.update).not.toHaveBeenCalled();
});