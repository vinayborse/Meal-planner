# ---- Build stage -----------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# copy only the pom first to take advantage of Docker layer caching
COPY pom.xml .
# download dependencies (no source needed yet)
RUN mvn -B dependency:go-offline

# copy source code
COPY src ./src
COPY src/main/resources/static ./src/main/resources/static

# build the JAR (skip tests for faster builds)
RUN mvn -B clean package -DskipTests

# ---- Runtime stage ---------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
