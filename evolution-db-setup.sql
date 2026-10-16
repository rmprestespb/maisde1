-- Cria o usuário e o banco que a Evolution API vai usar no Postgres que já
-- está instalado nesse PC. Roda uma vez só, como o superusuário "postgres"
-- (vai pedir a senha do postgres que você definiu quando instalou).

CREATE ROLE evolution WITH LOGIN PASSWORD 'nfls_UDErJY0uxRUk_GmL3hn';
CREATE DATABASE evolution OWNER evolution;
