package com.example.sqloptimizer;

import org.apache.ibatis.executor.Executor;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.mapping.ParameterMapping;
import org.apache.ibatis.plugin.Interceptor;
import org.apache.ibatis.plugin.Intercepts;
import org.apache.ibatis.plugin.Invocation;
import org.apache.ibatis.plugin.Signature;
import org.apache.ibatis.reflection.MetaObject;
import org.apache.ibatis.session.Configuration;

import java.util.ArrayList;
import java.util.List;

@Intercepts({
        @Signature(type = Executor.class, method = "query", args = {
                MappedStatement.class, Object.class, org.apache.ibatis.session.RowBounds.class,
                org.apache.ibatis.session.ResultHandler.class
        }),
        @Signature(type = Executor.class, method = "update", args = {
                MappedStatement.class, Object.class
        })
})
public class MyBatisSqlInterceptor implements Interceptor {
    private final SqlEventSink sink;

    public MyBatisSqlInterceptor(SqlEventSink sink) {
        this.sink = sink;
    }

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        long start = System.currentTimeMillis();
        Object target = invocation.getTarget();
        Object[] args = invocation.getArgs();
        MappedStatement mappedStatement = (MappedStatement) args[0];
        Object parameterObject = args.length > 1 ? args[1] : null;

        Object result = invocation.proceed();
        long execTime = System.currentTimeMillis() - start;

        BoundSql boundSql = mappedStatement.getBoundSql(parameterObject);
        String rawSql = normalizeWhitespace(boundSql.getSql());
        List<String> params = extractParams(mappedStatement.getConfiguration(), boundSql, parameterObject);

        String source = mappedStatement.getId();
        SqlEvent event = new SqlEvent(rawSql, params, execTime, System.currentTimeMillis(), source);
        if (sink != null) {
            sink.accept(event);
        }
        return result;
    }

    @Override
    public Object plugin(Object target) {
        return Interceptor.super.plugin(target);
    }

    @Override
    public void setProperties(java.util.Properties properties) {
        // no-op
    }

    private List<String> extractParams(Configuration configuration, BoundSql boundSql, Object parameterObject) {
        List<String> values = new ArrayList<>();
        if (parameterObject == null) {
            return values;
        }

        MetaObject metaObject = configuration.newMetaObject(parameterObject);
        for (ParameterMapping mapping : boundSql.getParameterMappings()) {
            String property = mapping.getProperty();
            Object value;
            if (boundSql.hasAdditionalParameter(property)) {
                value = boundSql.getAdditionalParameter(property);
            } else if (metaObject.hasGetter(property)) {
                value = metaObject.getValue(property);
            } else {
                value = null;
            }
            values.add(value == null ? null : String.valueOf(value));
        }
        return values;
    }

    private String normalizeWhitespace(String sql) {
        return sql == null ? "" : sql.replaceAll("\\s+", " ").trim();
    }
}
