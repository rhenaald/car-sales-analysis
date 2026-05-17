import os

class Config:
    DEBUG = False
    TESTING = False

class DevelopmentConfig(Config):
    DEBUG = True
    CORS_ORIGINS = ["http://localhost:3000"]

class ProductionConfig(Config):
    CORS_ORIGINS = ["https://car-sales-analysis-omega.vercel.app"]

# Switch config berdasarkan ENV variable
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig
}