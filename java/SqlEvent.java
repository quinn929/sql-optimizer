package com.example.sqloptimizer;

import java.util.List;

public class SqlEvent {
    private final String sql;
    private final List<String> params;
    private final long execTime;
    private final long timestamp;
    private final String source;

    public SqlEvent(String sql, List<String> params, long execTime, long timestamp, String source) {
        this.sql = sql;
        this.params = params;
        this.execTime = execTime;
        this.timestamp = timestamp;
        this.source = source;
    }

    public String getSql() {
        return sql;
    }

    public List<String> getParams() {
        return params;
    }

    public long getExecTime() {
        return execTime;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public String getSource() {
        return source;
    }
}
