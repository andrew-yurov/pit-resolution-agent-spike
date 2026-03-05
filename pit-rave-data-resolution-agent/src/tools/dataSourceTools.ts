import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";

/**
 * Tool Registry - Hardcoded data sources with their capabilities
 */
export interface DataSource {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  dataTypes: string[];
  metadata: {
    cost: "low" | "medium" | "high";
    latency: "fast" | "medium" | "slow";
    freshness: string;
  };
}

// Hardcoded data sources
const DATA_SOURCES: DataSource[] = [
  {
    id: "glassdoor",
    name: "Glassdoor",
    description: "Provides employee reviews, ratings, and sentiment data for companies",
    capabilities: ["sentiment", "reviews", "ratings", "culture", "compensation"],
    dataTypes: ["employee_sentiment", "company_ratings", "interview_reviews"],
    metadata: {
      cost: "medium",
      latency: "medium",
      freshness: "weekly"
    }
  },
  {
    id: "similarweb",
    name: "SimilarWeb",
    description: "Provides web traffic analytics, audience insights, and competitor analysis",
    capabilities: ["traffic", "audience", "competitors", "engagement", "demographics"],
    dataTypes: ["web_traffic", "audience_demographics", "competitor_metrics"],
    metadata: {
      cost: "high",
      latency: "fast",
      freshness: "daily"
    }
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Provides company information, employee data, and professional network insights",
    capabilities: ["employees", "company_info", "growth", "hiring", "skills"],
    dataTypes: ["employee_count", "hiring_trends", "company_profile"],
    metadata: {
      cost: "medium",
      latency: "fast",
      freshness: "realtime"
    }
  },
  {
    id: "crunchbase",
    name: "Crunchbase",
    description: "Provides funding, investment, and startup/company financial data",
    capabilities: ["funding", "investors", "acquisitions", "valuation", "founders"],
    dataTypes: ["funding_rounds", "investor_data", "company_financials"],
    metadata: {
      cost: "high",
      latency: "fast",
      freshness: "daily"
    }
  }
];

/**
 * Tool: Search for available data sources
 */
export const searchDataSourcesTool = new DynamicStructuredTool({
  name: "search_data_sources",
  description: "Search for available data sources that match specific capabilities or data types. Use this to discover what data sources are available for a given task.",
  schema: z.object({
    query: z.string().describe("Natural language query describing the data needed (e.g., 'employee sentiment', 'web traffic', 'funding data')"),
  }),
  func: async ({ query }) => {
    console.log(`🔍 Searching data sources for: "${query}"`);
    
    // Simple keyword matching (in production, use embeddings/semantic search)
    const queryLower = query.toLowerCase();
    const results = DATA_SOURCES.filter(source => {
      const searchText = `${source.description} ${source.capabilities.join(" ")} ${source.dataTypes.join(" ")}`.toLowerCase();
      return searchText.includes(queryLower) || 
             source.capabilities.some(cap => queryLower.includes(cap)) ||
             source.dataTypes.some(dt => queryLower.includes(dt.replace("_", " ")));
    });

    if (results.length === 0) {
      return JSON.stringify({
        found: false,
        message: `No data sources found matching: "${query}"`,
        available_sources: DATA_SOURCES.map(s => ({
          name: s.name,
          capabilities: s.capabilities
        }))
      });
    }

    return JSON.stringify({
      found: true,
      count: results.length,
      sources: results.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        capabilities: s.capabilities,
        metadata: s.metadata
      }))
    });
  },
});

/**
 * Tool: Get detailed information about a specific data source
 */
export const getDataSourceDetailsTool = new DynamicStructuredTool({
  name: "get_data_source_details",
  description: "Get detailed information about a specific data source including its capabilities, data types, cost, and latency",
  schema: z.object({
    source_id: z.string().describe("The ID of the data source (e.g., 'glassdoor', 'similarweb')"),
  }),
  func: async ({ source_id }) => {
    console.log(`📊 Getting details for data source: ${source_id}`);
    
    const source = DATA_SOURCES.find(s => s.id === source_id);
    
    if (!source) {
      return JSON.stringify({
        error: `Data source '${source_id}' not found`,
        available_sources: DATA_SOURCES.map(s => s.id)
      });
    }

    return JSON.stringify({
      success: true,
      source: source
    });
  },
});

/**
 * Tool: Fetch sample data from a data source
 */
export const fetchSampleDataTool = new DynamicStructuredTool({
  name: "fetch_sample_data",
  description: "Fetch sample data from a specific data source for a given company. Returns mock data for demonstration.",
  schema: z.object({
    source_id: z.string().describe("The ID of the data source"),
    company_name: z.string().describe("The name of the company to fetch data for"),
    data_type: z.string().optional().describe("Specific type of data to fetch (optional)"),
  }),
  func: async ({ source_id, company_name, data_type }) => {
    console.log(`📥 Fetching sample data from ${source_id} for ${company_name}`);
    
    const source = DATA_SOURCES.find(s => s.id === source_id);
    
    if (!source) {
      return JSON.stringify({ error: `Data source '${source_id}' not found` });
    }

    // Mock data based on source type
    const mockData: Record<string, any> = {
      glassdoor: {
        company: company_name,
        overall_rating: 4.2,
        sentiment_score: 0.75,
        total_reviews: 1523,
        culture_rating: 4.1,
        compensation_rating: 3.9,
        work_life_balance: 4.0,
        recent_reviews: [
          { date: "2026-01-03", rating: 5, sentiment: "positive", text: "Great place to work" },
          { date: "2026-01-02", rating: 3, sentiment: "neutral", text: "Average experience" }
        ]
      },
      similarweb: {
        company: company_name,
        monthly_visits: 15000000,
        bounce_rate: 0.42,
        avg_visit_duration: "5:23",
        pages_per_visit: 3.8,
        traffic_sources: {
          direct: 0.35,
          search: 0.28,
          social: 0.15,
          referral: 0.22
        },
        top_countries: ["United States", "United Kingdom", "Canada"]
      },
      linkedin: {
        company: company_name,
        employee_count: 5420,
        employee_growth_6m: 12.5,
        hiring_trends: "increasing",
        top_job_functions: ["Engineering", "Sales", "Marketing"],
        locations: ["San Francisco", "New York", "Austin"]
      },
      crunchbase: {
        company: company_name,
        total_funding: "$250M",
        valuation: "$1.2B",
        funding_rounds: 4,
        last_funding_date: "2025-11-15",
        investors: ["Sequoia Capital", "Andreessen Horowitz", "Y Combinator"],
        founded_date: "2018-03-01"
      }
    };

    const data = mockData[source_id] || { message: "No mock data available for this source" };
    
    return JSON.stringify({
      success: true,
      source: source_id,
      company: company_name,
      data_type: data_type || "all",
      data: data,
      metadata: source.metadata
    });
  },
});

/**
 * Tool: Compare multiple data sources
 */
export const compareDataSourcesTool = new DynamicStructuredTool({
  name: "compare_data_sources",
  description: "Compare multiple data sources based on cost, latency, and capabilities to help select the best option",
  schema: z.object({
    source_ids: z.array(z.string()).describe("Array of data source IDs to compare"),
    criteria: z.enum(["cost", "latency", "capabilities", "all"]).optional().describe("What to compare (default: all)"),
  }),
  func: async ({ source_ids, criteria = "all" }) => {
    console.log(`⚖️ Comparing data sources: ${source_ids.join(", ")}`);
    
    const sources = DATA_SOURCES.filter(s => source_ids.includes(s.id));
    
    if (sources.length === 0) {
      return JSON.stringify({ error: "No valid data sources found" });
    }

    const comparison = sources.map(s => ({
      id: s.id,
      name: s.name,
      cost: s.metadata.cost,
      latency: s.metadata.latency,
      freshness: s.metadata.freshness,
      capabilities_count: s.capabilities.length,
      capabilities: s.capabilities
    }));

    // Provide recommendation
    const cheapest = comparison.reduce((min, s) => 
      s.cost === "low" ? s : (min.cost === "low" ? min : s)
    );
    const fastest = comparison.find(s => s.latency === "fast");

    return JSON.stringify({
      comparison,
      recommendations: {
        cheapest: cheapest.name,
        fastest: fastest?.name || comparison[0].name,
        most_capable: comparison.reduce((max, s) => 
          s.capabilities_count > max.capabilities_count ? s : max
        ).name
      }
    });
  },
});

// Export all tools as an array
export const dataResolutionTools = [
  searchDataSourcesTool,
  getDataSourceDetailsTool,
  fetchSampleDataTool,
  compareDataSourcesTool,
];
