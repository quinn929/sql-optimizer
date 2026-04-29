package com.example.sqloptimizer;

public interface SqlEventSink {
    void accept(SqlEvent event);
}
