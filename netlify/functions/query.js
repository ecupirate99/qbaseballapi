// netlify/functions/query.js
const fetch = require("node-fetch");

exports.handler = async (event) => {
  const baseId = "YOUR_BASE_ID";       // replace with your Airtable Base ID
  const tableName = "Players";         // replace with your table name
  const apiKey = process.env.AIRTABLE_API_KEY;

  const query = event.queryStringParameters.query;

  let url = "";
  let transform = (records) => records;

  switch (query) {
    case "topStat": {
      const stat = event.queryStringParameters.stat || "HR";
      const limit = event.queryStringParameters.limit || 10;
      url = `https://api.airtable.com/v0/${baseId}/${tableName}?sort[0][field]=${stat}&sort[0][direction]=desc&maxRecords=${limit}`;
      transform = (records) => records.map(r => ({
        Name: r.fields.Name,
        [stat]: r.fields[stat]
      }));
      break;
    }

    case "playersFromCity": {
      const city = event.queryStringParameters.city || "";
      url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${encodeURIComponent(`SEARCH('${city}', {Birthplace})`)}`;
      transform = (records) => records.map(r => ({
        Name: r.fields.Name,
        Birthplace: r.fields.Birthplace
      }));
      break;
    }

    case "countCity": {
      const cityCount = event.queryStringParameters.city || "";
      url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${encodeURIComponent(`SEARCH('${cityCount}', {Birthplace})`)}`;
      transform = (records) => ({ city: cityCount, count: records.length });
      break;
    }

    case "lowestERA": {
      const minIP = event.queryStringParameters.minIP || 100;
      url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${encodeURIComponent(`AND({IP} >= ${minIP}, {ERA} > 0)`)}&sort[0][field]=ERA&sort[0][direction]=asc&maxRecords=10`;
      transform = (records) => records.map(r => ({
        Name: r.fields.Name,
        ERA: r.fields.ERA,
        IP: r.fields.IP
      }));
      break;
    }

    default:
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Unknown query type" })
      };
  }

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(transform(data.records))
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
