package repository

import (
	intf "eventpass/repository/intf"

	"github.com/jmoiron/sqlx"
)

type Repository struct {
	Postgres *PostgresRepo
}

type PostgresRepo struct {
	*sqlx.Tx
	User  intf.UserRepository
	Event intf.EventRepository
}
