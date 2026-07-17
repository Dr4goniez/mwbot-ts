import { Mwbot } from '../../dist';

export type TestDomain = 'localwiki' | 'testwiki';

export type AuthMethod = 'oauth2' | 'oauth1' | 'botpassword' | 'anonymous';

export type MwbotTestSuite = (
	getMwbot: () => Mwbot,
	testDomain: TestDomain,
	authMethod: AuthMethod
) => void;
