export type AdvertisingPlatform = 'meta' | 'google' | 'both';

export type DashboardTab = 'home' | 'agent' | 'connections' | 'campaigns' | 'dashboards';

export type CampaignObjective = 
  | 'conversions_sales' 
  | 'lead_generation' 
  | 'traffic' 
  | 'brand_awareness' 
  | 'app_promotion';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'agency_admin' | 'brand_manager';
  workspaceName: string;
  credits: number;
  isAuthenticated: boolean;
}

export interface CreditTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'debit' | 'credit' | 'refund';
  description: string;
  campaignId?: string;
}

export interface MetaConnectionState {
  isConnected: boolean;
  status: 'disconnected' | 'connected_needs_perms' | 'ready_to_deploy';
  userAccessToken?: string;
  businessManagerId?: string;
  businessManagerName?: string;
  adAccountId?: string;
  adAccountName?: string;
  pixelId?: string;
  pixelName?: string;
  pageId?: string;
  pageName?: string;
  permissions: {
    adsManagement: boolean;
    pagesReadEngagement: boolean;
    businessManagement: boolean;
  };
  diagnostics: string[];
  appName?: string;
  appId?: string;
  userName?: string;
  userId?: string;
  userType?: string;
  isRealToken?: boolean;
}

export interface GoogleConnectionState {
  isConnected: boolean;
  status: 'disconnected' | 'needs_auth' | 'connected';
  customerId?: string;
  customerName?: string;
  mccId?: string;
  developerTokenStatus?: 'approved' | 'test' | 'pending';
  conversionActionId?: string;
  diagnostics: string[];
}

export interface CreativeAsset {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  aspectRatio: '1:1' | '9:16' | '16:9';
  assignedAdTitle?: string;
}

export interface ClientBriefing {
  id?: string;
  brandName: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  objective: CampaignObjective;
  budgetTotal: number;
  currency: 'USD' | 'COP' | 'EUR' | 'MXN';
  startDate: string;
  endDate: string;
  preferredPlatforms: AdvertisingPlatform;
  additionalNotes?: string;
}

export interface AdCopyOption {
  id: string;
  headline: string;
  description: string;
  callToAction: string;
}

export interface GoogleAdsStrategy {
  campaignType: 'SEARCH' | 'PERFORMANCE_MAX' | 'DISPLAY';
  keywords: string[];
  headlines: string[];
  descriptions: string[];
  targetLocations: string[];
  budgetSharePercentage: number;
  budgetAmount: number;
  estimatedClicks?: number;
  estimatedCpc?: number;
}

export interface MetaAdsStrategy {
  campaignName: string;
  objective: string;
  placements: ('instagram_feed' | 'instagram_stories' | 'facebook_feed' | 'facebook_reels')[];
  interestsAndBehaviors: string[];
  primaryTexts: string[];
  headlines: string[];
  callToAction: 'LEARN_MORE' | 'SHOP_NOW' | 'SIGN_UP' | 'CONTACT_US';
  budgetSharePercentage: number;
  budgetAmount: number;
  dailyBudget: number;
  creatives?: CreativeAsset[];
}

export interface GeneratedCampaignStrategy {
  briefingId: string;
  brandName: string;
  strategySummary: string;
  totalBudget: number;
  currency: string;
  createdAt: string;
  creditCost: number;
  googleAds?: GoogleAdsStrategy;
  metaAds?: MetaAdsStrategy;
  creatives: CreativeAsset[];
  complianceChecked: boolean;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'deploying' | 'active' | 'failed';
  deployedMetaCampaignId?: string;
  deployedGoogleCampaignId?: string;
}

export interface DeploymentLog {
  timestamp: string;
  platform: 'meta' | 'google' | 'system';
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
}
