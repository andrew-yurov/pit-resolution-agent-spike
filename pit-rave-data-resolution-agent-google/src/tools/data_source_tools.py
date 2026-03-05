"""
Data Source Tools for Google ADK
Hardcoded tools for discovering and querying data sources.
"""

import json
from typing import Any, Dict, List, Optional


# Hardcoded data sources aligned with agent.tool_registry schema
DATA_SOURCES = [
    {
        "tool_id": "glassdoor_company_reviews",
        "mcp_server": "glassdoor-mcp",
        "mcp_tool_name": "get_company_reviews",
        "name": "Glassdoor",
        "description": "Employee reviews platform providing company ratings, salary data, interview experiences, and workplace culture insights. Delivers sentiment analysis from current and former employees, CEO approval ratings, and compensation benchmarks.",
        "adapter_key": "RAVE",
        "module_key": "glassdoor",
        "capabilities": ["sentiment", "reviews", "ratings", "culture", "compensation", "interviews", "benefits", "ceo_approval"],
        "metadata": {
            "cost": "medium",
            "latency": "medium",
            "freshness": "weekly",
            "data_volume": "high",
            "reliability": "high"
        },
    },
    {
        "tool_id": "github_repository_analytics",
        "mcp_server": "github-mcp",
        "mcp_tool_name": "get_repository_metrics",
        "name": "GitHub",
        "description": "Software development platform providing repository analytics, code activity metrics, developer contributions, project popularity (stars/forks), issue tracking, pull request data, and open source project insights.",
        "adapter_key": "RAVE",
        "module_key": "github",
        "capabilities": ["repositories", "commits", "contributors", "stars", "forks", "issues", "pull_requests", "code_activity", "developer_engagement"],
        "metadata": {
            "cost": "low",
            "latency": "fast",
            "freshness": "realtime",
            "data_volume": "very_high",
            "reliability": "very_high"
        },
    },
    {
        "tool_id": "semrush_seo_analytics",
        "mcp_server": "semrush-mcp",
        "mcp_tool_name": "get_seo_metrics",
        "name": "Semrush",
        "description": "SEO and digital marketing platform providing keyword rankings, organic search traffic, backlink analysis, paid advertising insights, competitor SEO strategies, domain authority metrics, and content marketing performance data.",
        "adapter_key": "RAVE",
        "module_key": "semrush",
        "capabilities": ["seo", "keywords", "organic_traffic", "backlinks", "paid_advertising", "competitor_analysis", "domain_authority", "content_performance"],
        "metadata": {
            "cost": "high",
            "latency": "medium",
            "freshness": "daily",
            "data_volume": "high",
            "reliability": "high"
        },
    },
    {
        "tool_id": "similarweb_traffic_analytics",
        "mcp_server": "similarweb-mcp",
        "mcp_tool_name": "get_traffic_metrics",
        "name": "SimilarWeb",
        "description": "Digital intelligence platform providing website traffic analytics, audience demographics, engagement metrics, traffic sources, referral data, mobile app analytics, market share insights, and competitive benchmarking across industries.",
        "adapter_key": "RAVE",
        "module_key": "similarweb",
        "capabilities": ["traffic", "audience", "demographics", "engagement", "traffic_sources", "referrals", "mobile_analytics", "market_share", "competitors"],
        "metadata": {
            "cost": "high",
            "latency": "fast",
            "freshness": "daily",
            "data_volume": "very_high",
            "reliability": "high"
        },
    },
    {
        "tool_id": "pathmatics_advertising_intelligence",
        "mcp_server": "pathmatics-mcp",
        "mcp_tool_name": "get_ad_intelligence",
        "name": "Pathmatics",
        "description": "Digital advertising intelligence platform tracking display ads, video ads, social media advertising spend, creative performance, ad placements, competitor advertising strategies, brand safety metrics, and cross-channel marketing campaigns.",
        "adapter_key": "RAVE",
        "module_key": "pathmatics",
        "capabilities": ["advertising", "ad_spend", "creative_analysis", "ad_placements", "competitor_ads", "video_ads", "social_ads", "brand_safety", "campaign_tracking"],
        "metadata": {
            "cost": "high",
            "latency": "medium",
            "freshness": "daily",
            "data_volume": "high",
            "reliability": "high"
        },
    },
    {
        "tool_id": "snowflake_data_warehouse",
        "mcp_server": "snowflake-mcp",
        "mcp_tool_name": "query_data",
        "name": "Snowflake",
        "description": "Cloud data warehouse providing SQL-based querying of structured and semi-structured data, data sharing capabilities, analytics workloads, data lake integration, and access to internal company data, custom datasets, and third-party data marketplace.",
        "adapter_key": "RAVE",
        "module_key": "snowflake",
        "capabilities": ["data_warehouse", "sql_queries", "analytics", "data_sharing", "custom_datasets", "data_lake", "etl", "data_marketplace"],
        "metadata": {
            "cost": "variable",
            "latency": "fast",
            "freshness": "realtime",
            "data_volume": "unlimited",
            "reliability": "very_high"
        },
    },
    {
        "tool_id": "stackoverflow_developer_insights",
        "mcp_server": "stackoverflow-mcp",
        "mcp_tool_name": "get_developer_data",
        "name": "StackOverflow",
        "description": "Developer community platform providing technology trend analysis, programming language popularity, framework adoption rates, developer skill distribution, question/answer activity, tag analytics, and technology ecosystem insights.",
        "adapter_key": "RAVE",
        "module_key": "stackoverflow",
        "capabilities": ["technology_trends", "programming_languages", "frameworks", "developer_skills", "community_activity", "tag_analytics", "question_patterns", "technology_adoption"],
        "metadata": {
            "cost": "low",
            "latency": "fast",
            "freshness": "realtime",
            "data_volume": "very_high",
            "reliability": "high"
        },
    },
    {
        "tool_id": "sensor_tower_mobile_analytics",
        "mcp_server": "sensortower-mcp",
        "mcp_tool_name": "get_mobile_metrics",
        "name": "Sensor Tower",
        "description": "Mobile app analytics platform providing app download estimates, revenue data, user acquisition metrics, app store rankings, competitor app performance, market intelligence, advertising analytics, and mobile game industry insights across iOS and Android.",
        "adapter_key": "RAVE",
        "module_key": "sensortower",
        "capabilities": ["mobile_apps", "downloads", "revenue", "rankings", "user_acquisition", "competitor_apps", "ad_intelligence", "market_trends", "ios_android"],
        "metadata": {
            "cost": "high",
            "latency": "medium",
            "freshness": "daily",
            "data_volume": "high",
            "reliability": "high"
        },
    },
    {
        "tool_id": "revelio_workforce_analytics",
        "mcp_server": "revelio-mcp",
        "mcp_tool_name": "get_workforce_data",
        "name": "Revelio Labs",
        "description": "Workforce intelligence platform providing employee headcount tracking, hiring and attrition rates, job posting analysis, talent flow between companies, skill distribution, compensation trends, labor market dynamics, and workforce composition insights.",
        "adapter_key": "RAVE",
        "module_key": "revelio",
        "capabilities": ["workforce", "headcount", "hiring", "attrition", "talent_flow", "job_postings", "skills", "compensation", "labor_market"],
        "metadata": {
            "cost": "high",
            "latency": "medium",
            "freshness": "weekly",
            "data_volume": "high",
            "reliability": "high"
        },
    },
    {
        "tool_id": "aura_workforce_intelligence",
        "mcp_server": "aura-mcp",
        "mcp_tool_name": "get_global_workforce_data",
        "name": "Aura Intelligence",
        "description": "Global workforce data and analytics platform providing comprehensive labor market intelligence, workforce demographics, employment trends, salary benchmarks, skills mapping, talent mobility patterns, industry workforce insights, and cross-border employment analytics across multiple regions.",
        "adapter_key": "RAVE",
        "module_key": "aura",
        "capabilities": ["global_workforce", "labor_market", "employment_trends", "salary_benchmarks", "skills_mapping", "talent_mobility", "workforce_demographics", "industry_insights", "regional_analytics"],
        "metadata": {
            "cost": "high",
            "latency": "medium",
            "freshness": "monthly",
            "data_volume": "very_high",
            "reliability": "high"
        },
    },
]


def search_data_sources(query: str) -> str:
    """Search for available data sources that match specific capabilities or data types.
    Use this to discover what data sources are available for a given task.

    Args:
        query: Natural language query describing the data needed
               (e.g., 'employee sentiment', 'web traffic', 'funding data')

    Returns:
        JSON string with search results
    """
    print(f"🔍 Searching data sources for: '{query}'")

    # Simple keyword matching (in production, use embeddings/semantic search)
    query_lower = query.lower()
    results = []

    for source in DATA_SOURCES:
        search_text = (
            f"{source['description']} "
            f"{' '.join(source['capabilities'])} "
            f"{' '.join(source['data_types'])}"
        ).lower()

        # Check if query matches
        if (
            query_lower in search_text
            or any(cap in query_lower for cap in source["capabilities"])
            or any(dt.replace("_", " ") in query_lower for dt in source["data_types"])
        ):
            results.append(source)

    if not results:
        return json.dumps(
            {
                "found": False,
                "message": f"No data sources found matching: '{query}'",
                "available_sources": [
                    {"name": s["name"], "capabilities": s["capabilities"]}
                    for s in DATA_SOURCES
                ],
            }
        )

    return json.dumps(
        {
            "found": True,
            "count": len(results),
            "sources": [
                {
                    "tool_id": s["tool_id"],
                    "name": s["name"],
                    "module_key": s["module_key"],
                    "description": s["description"],
                    "capabilities": s["capabilities"],
                    "metadata": s["metadata"],
                }
                for s in results
            ],
        }
    )


def get_data_source_details(source_id: str) -> str:
    """Get detailed information about a specific data source including its capabilities,
    data types, cost, and latency.

    Args:
        source_id: The ID of the data source (e.g., 'glassdoor', 'similarweb')

    Returns:
        JSON string with source details
    """
    print(f"📊 Getting details for data source: {source_id}")

    source = next((s for s in DATA_SOURCES if s["tool_id"] == source_id or s["module_key"] == source_id), None)

    if not source:
        return json.dumps(
            {
                "error": f"Data source '{source_id}' not found",
                "available_sources": [s["tool_id"] for s in DATA_SOURCES],
            }
        )

    return json.dumps({"success": True, "source": source})


def fetch_sample_data(company_name: str, source_id: str, data_type: Optional[str] = None) -> str:
    """Fetch sample data from a specific data source for a given company.
    Returns mock data for demonstration.

    Args:
        company_name: The name of the company to fetch data for
        source_id: The tool_id or module_key of the data source
        data_type: Specific type of data to fetch (optional)

    Returns:
        JSON string with sample data
    """
    print(f"📥 Fetching sample data from {source_id} for {company_name}")

    source = next((s for s in DATA_SOURCES if s["tool_id"] == source_id or s["module_key"] == source_id), None)

    if not source:
        return json.dumps({"error": f"Data source '{source_id}' not found"})

    # Mock data based on module_key
    module_key = source["module_key"]
    mock_data = {
        "glassdoor": {
            "company": company_name,
            "overall_rating": 4.2,
            "sentiment_score": 0.75,
            "total_reviews": 1523,
            "culture_rating": 4.1,
            "compensation_rating": 3.9,
            "work_life_balance": 4.0,
            "recent_reviews": [
                {
                    "date": "2026-01-03",
                    "rating": 5,
                    "sentiment": "positive",
                    "text": "Great place to work",
                },
                {
                    "date": "2026-01-02",
                    "rating": 3,
                    "sentiment": "neutral",
                    "text": "Average experience",
                },
            ],
        },
        "github": {
            "company": company_name,
            "total_repositories": 342,
            "total_stars": 45230,
            "total_forks": 8920,
            "active_contributors": 1250,
            "monthly_commits": 3420,
            "open_issues": 456,
            "open_pull_requests": 89,
            "primary_languages": ["TypeScript", "Python", "Go"],
        },
        "semrush": {
            "company": company_name,
            "domain_authority": 78,
            "organic_traffic_monthly": 2500000,
            "organic_keywords": 125000,
            "paid_keywords": 8500,
            "backlinks": 450000,
            "referring_domains": 12000,
            "top_organic_keywords": ["project management", "collaboration tool", "team software"],
        },
        "similarweb": {
            "company": company_name,
            "monthly_visits": 15000000,
            "bounce_rate": 0.42,
            "avg_visit_duration": "5:23",
            "pages_per_visit": 3.8,
            "traffic_sources": {"direct": 0.35, "search": 0.28, "social": 0.15, "referral": 0.22},
            "top_countries": ["United States", "United Kingdom", "Canada"],
        },
        "pathmatics": {
            "company": company_name,
            "monthly_ad_spend": "$1.2M",
            "active_campaigns": 45,
            "display_ads": 234,
            "video_ads": 89,
            "social_ads": 156,
            "top_ad_platforms": ["Facebook", "Google Display", "YouTube"],
            "ad_impressions_monthly": 45000000,
        },
        "snowflake": {
            "company": company_name,
            "available_schemas": 15,
            "total_tables": 342,
            "data_volume_tb": 156.8,
            "query_performance": "optimized",
            "data_freshness": "realtime",
            "accessible_datasets": ["sales", "marketing", "product", "customer"],
        },
        "stackoverflow": {
            "company": company_name,
            "technology_tags": ["react", "python", "kubernetes", "aws"],
            "monthly_questions": 1250,
            "monthly_answers": 3400,
            "community_reputation": "high",
            "trending_technologies": ["AI/ML", "Cloud Native", "DevOps"],
            "developer_interest_score": 8.5,
        },
        "sensortower": {
            "company": company_name,
            "monthly_downloads": 850000,
            "monthly_revenue": "$450K",
            "app_store_ranking": 45,
            "google_play_ranking": 38,
            "user_retention_30d": 0.42,
            "avg_rating_ios": 4.5,
            "avg_rating_android": 4.3,
        },
        "revelio": {
            "company": company_name,
            "total_headcount": 5420,
            "headcount_growth_6m": 12.5,
            "hiring_rate": "15.2%",
            "attrition_rate": "8.5%",
            "top_hiring_roles": ["Software Engineer", "Product Manager", "Sales Executive"],
            "talent_inflow_companies": ["Google", "Microsoft", "Amazon"],
            "avg_tenure_months": 28,
        },
        "aura": {
            "company": company_name,
            "global_workforce_size": 8750,
            "regional_distribution": {
                "north_america": 3200,
                "europe": 2800,
                "asia_pacific": 2100,
                "latin_america": 450,
                "middle_east_africa": 200,
            },
            "employment_trends_12m": "+18.3%",
            "salary_benchmarks": {
                "software_engineer": {"median": "$125K", "range": "$95K-$165K"},
                "product_manager": {"median": "$140K", "range": "$110K-$185K"},
                "data_scientist": {"median": "$135K", "range": "$105K-$175K"},
            },
            "skills_distribution": {
                "technical": 62,
                "business": 25,
                "creative": 8,
                "operations": 5,
            },
            "talent_mobility_score": 7.8,
            "workforce_demographics": {
                "avg_age": 32,
                "education_level": {"bachelors": 45, "masters": 38, "phd": 12, "other": 5},
            },
            "industry_insights": "High-growth technology sector with strong international expansion",
        },
    }

    data = mock_data.get(module_key, {"message": "No mock data available for this source"})

    return json.dumps(
        {
            "success": True,
            "tool_id": source["tool_id"],
            "module_key": module_key,
            "company": company_name,
            "data_type": data_type or "all",
            "data": data,
            "metadata": source["metadata"],
        }
    )


def compare_data_sources(source_ids: str, criteria: str = "all") -> str:
    """Compare multiple data sources based on cost, latency, and capabilities
    to help select the best option.

    Args:
        source_ids: Comma-separated string of data source IDs to compare
        criteria: What to compare - 'cost', 'latency', 'capabilities', or 'all' (default: 'all')

    Returns:
        JSON string with comparison results
    """
    # Parse comma-separated string into list
    source_id_list = [s.strip() for s in source_ids.split(",")]
    print(f"⚖️ Comparing data sources: {', '.join(source_id_list)}")

    sources = [s for s in DATA_SOURCES if s["tool_id"] in source_id_list or s["module_key"] in source_id_list]

    if not sources:
        return json.dumps({"error": "No valid data sources found"})

    comparison = [
        {
            "tool_id": s["tool_id"],
            "name": s["name"],
            "module_key": s["module_key"],
            "cost": s["metadata"]["cost"],
            "latency": s["metadata"]["latency"],
            "freshness": s["metadata"]["freshness"],
            "capabilities_count": len(s["capabilities"]),
            "capabilities": s["capabilities"],
        }
        for s in sources
    ]

    # Provide recommendations
    cheapest = min(
        comparison,
        key=lambda s: {"low": 0, "medium": 1, "high": 2}.get(s["cost"], 2),
    )
    fastest = next((s for s in comparison if s["latency"] == "fast"), comparison[0])
    most_capable = max(comparison, key=lambda s: s["capabilities_count"])

    return json.dumps(
        {
            "comparison": comparison,
            "recommendations": {
                "cheapest": cheapest["name"],
                "fastest": fastest["name"],
                "most_capable": most_capable["name"],
            },
        }
    )


# Define function declarations for Google ADK
TOOL_DECLARATIONS = [
    {
        "name": "search_data_sources",
        "description": "Search for available data sources that match specific capabilities or data types. Use this to discover what data sources are available for a given task.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language query describing the data needed (e.g., 'employee sentiment', 'web traffic', 'funding data')",
                }
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_data_source_details",
        "description": "Get detailed information about a specific data source including its capabilities, data types, cost, and latency",
        "parameters": {
            "type": "object",
            "properties": {
                "source_id": {
                    "type": "string",
                    "description": "The tool_id or module_key of the data source (e.g., 'glassdoor_company_reviews', 'glassdoor', 'github_repository_analytics', 'github')",
                }
            },
            "required": ["source_id"],
        },
    },
    {
        "name": "fetch_sample_data",
        "description": "Fetch sample data from a specific data source for a given company. Returns mock data for demonstration.",
        "parameters": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "The name of the company to fetch data for",
                },
                "source_id": {
                    "type": "string",
                    "description": "The tool_id or module_key of the data source",
                },
                "data_type": {
                    "type": "string",
                    "description": "Specific type of data to fetch (optional)",
                },
            },
            "required": ["company_name", "source_id"],
        },
    },
    {
        "name": "compare_data_sources",
        "description": "Compare multiple data sources based on cost, latency, and capabilities to help select the best option",
        "parameters": {
            "type": "object",
            "properties": {
                "source_ids": {
                    "type": "string",
                    "description": "Comma-separated string of tool_ids or module_keys to compare (e.g., 'glassdoor,similarweb,github')",
                },
                "criteria": {
                    "type": "string",
                    "description": "What to compare - 'cost', 'latency', 'capabilities', or 'all' (default: 'all')",
                    "enum": ["cost", "latency", "capabilities", "all"],
                },
            },
            "required": ["source_ids"],
        },
    },
]

# Tool function mapping
TOOL_FUNCTIONS = {
    "search_data_sources": search_data_sources,
    "get_data_source_details": get_data_source_details,
    "fetch_sample_data": fetch_sample_data,
    "compare_data_sources": compare_data_sources,
}
