"""
Data Source Tools

Hardcoded tools for discovering and querying data sources.
"""

import json
from typing import Any, Dict, List, Optional
from langchain_core.tools import tool


# Hardcoded data sources
DATA_SOURCES = [
    {
        "id": "glassdoor",
        "name": "Glassdoor",
        "description": "Provides employee reviews, ratings, and sentiment data for companies",
        "capabilities": ["sentiment", "reviews", "ratings", "culture", "compensation"],
        "data_types": ["employee_sentiment", "company_ratings", "interview_reviews"],
        "metadata": {"cost": "medium", "latency": "medium", "freshness": "weekly"},
    },
    {
        "id": "similarweb",
        "name": "SimilarWeb",
        "description": "Provides web traffic analytics, audience insights, and competitor analysis",
        "capabilities": ["traffic", "audience", "competitors", "engagement", "demographics"],
        "data_types": ["web_traffic", "audience_demographics", "competitor_metrics"],
        "metadata": {"cost": "high", "latency": "fast", "freshness": "daily"},
    },
    {
        "id": "linkedin",
        "name": "LinkedIn",
        "description": "Provides company information, employee data, and professional network insights",
        "capabilities": ["employees", "company_info", "growth", "hiring", "skills"],
        "data_types": ["employee_count", "hiring_trends", "company_profile"],
        "metadata": {"cost": "medium", "latency": "fast", "freshness": "realtime"},
    },
    {
        "id": "crunchbase",
        "name": "Crunchbase",
        "description": "Provides funding, investment, and startup/company financial data",
        "capabilities": ["funding", "investors", "acquisitions", "valuation", "founders"],
        "data_types": ["funding_rounds", "investor_data", "company_financials"],
        "metadata": {"cost": "high", "latency": "fast", "freshness": "daily"},
    },
]


@tool
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
                    "id": s["id"],
                    "name": s["name"],
                    "description": s["description"],
                    "capabilities": s["capabilities"],
                    "metadata": s["metadata"],
                }
                for s in results
            ],
        }
    )


@tool
def get_data_source_details(source_id: str) -> str:
    """Get detailed information about a specific data source including its capabilities,
    data types, cost, and latency.
    
    Args:
        source_id: The ID of the data source (e.g., 'glassdoor', 'similarweb')
    
    Returns:
        JSON string with source details
    """
    print(f"📊 Getting details for data source: {source_id}")

    source = next((s for s in DATA_SOURCES if s["id"] == source_id), None)

    if not source:
        return json.dumps(
            {
                "error": f"Data source '{source_id}' not found",
                "available_sources": [s["id"] for s in DATA_SOURCES],
            }
        )

    return json.dumps({"success": True, "source": source})


@tool
def fetch_sample_data(company_name: str, source_id: str, data_type: Optional[str] = None) -> str:
    """Fetch sample data from a specific data source for a given company.
    Returns mock data for demonstration.
    
    Args:
        company_name: The name of the company to fetch data for
        source_id: The ID of the data source
        data_type: Specific type of data to fetch (optional)
    
    Returns:
        JSON string with sample data
    """
    print(f"📥 Fetching sample data from {source_id} for {company_name}")

    source = next((s for s in DATA_SOURCES if s["id"] == source_id), None)

    if not source:
        return json.dumps({"error": f"Data source '{source_id}' not found"})

    # Mock data based on source type
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
        "similarweb": {
            "company": company_name,
            "monthly_visits": 15000000,
            "bounce_rate": 0.42,
            "avg_visit_duration": "5:23",
            "pages_per_visit": 3.8,
            "traffic_sources": {"direct": 0.35, "search": 0.28, "social": 0.15, "referral": 0.22},
            "top_countries": ["United States", "United Kingdom", "Canada"],
        },
        "linkedin": {
            "company": company_name,
            "employee_count": 5420,
            "employee_growth_6m": 12.5,
            "hiring_trends": "increasing",
            "top_job_functions": ["Engineering", "Sales", "Marketing"],
            "locations": ["San Francisco", "New York", "Austin"],
        },
        "crunchbase": {
            "company": company_name,
            "total_funding": "$250M",
            "valuation": "$1.2B",
            "funding_rounds": 4,
            "last_funding_date": "2025-11-15",
            "investors": ["Sequoia Capital", "Andreessen Horowitz", "Y Combinator"],
            "founded_date": "2018-03-01",
        },
    }

    data = mock_data.get(source_id, {"message": "No mock data available for this source"})

    return json.dumps(
        {
            "success": True,
            "source": source_id,
            "company": company_name,
            "data_type": data_type or "all",
            "data": data,
            "metadata": source["metadata"],
        }
    )


@tool
def compare_data_sources(source_ids: List[str], criteria: str = "all") -> str:
    """Compare multiple data sources based on cost, latency, and capabilities
    to help select the best option.
    
    Args:
        source_ids: Array of data source IDs to compare
        criteria: What to compare - 'cost', 'latency', 'capabilities', or 'all' (default: 'all')
    
    Returns:
        JSON string with comparison results
    """
    print(f"⚖️ Comparing data sources: {', '.join(source_ids)}")

    sources = [s for s in DATA_SOURCES if s["id"] in source_ids]

    if not sources:
        return json.dumps({"error": "No valid data sources found"})

    comparison = [
        {
            "id": s["id"],
            "name": s["name"],
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


# Export all tools as a list
data_resolution_tools = [
    search_data_sources,
    get_data_source_details,
    fetch_sample_data,
    compare_data_sources,
]
