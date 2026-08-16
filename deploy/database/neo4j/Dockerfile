FROM neo4j:5.26.28-community

# Pin the APOC Core 5.26.28 artifact and keep the image and data resources
# owned by this deployment.
RUN echo "399826fa8ac759c5f94121b91f00c13c86aecff628172d336c4e8171c5f499ef  /var/lib/neo4j/labs/apoc-5.26.28-core.jar" \
      | sha256sum -c - \
    && cp /var/lib/neo4j/labs/apoc-5.26.28-core.jar /var/lib/neo4j/plugins/apoc-5.26.28-core.jar

COPY healthcheck.sh /opt/mcb/healthcheck.sh
RUN chmod 0555 /opt/mcb/healthcheck.sh
