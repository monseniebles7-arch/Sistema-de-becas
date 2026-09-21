from flask import Flask, render_template, request, redirect, url_for, session
from conexion import obtener_conexion
from functools import wraps

app = Flask(__name__)
app.secret_key = "cambiar_esto_en_produccion"

def requiere_login(vista):
    @wraps(vista)
    def envoltura(*args, **kwargs):
        if "usuario" not in session:
            return redirect(url_for("login"))
        return vista(*args, **kwargs)
    return envoltura

@app.route("/")
def raiz():
    if "usuario" in session:
        return redirect(url_for("inicio"))
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        usuario = request.form.get("usuario")
        contrasena = request.form.get("contrasena")
        # TODO: tu compañero valida esto contra la tabla de administradores
        if usuario == "admin" and contrasena == "admin":
            session["usuario"] = usuario
            return redirect(url_for("inicio"))
        else:
            return render_template("login.html", error="Usuario o contraseña incorrectos.")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("usuario", None)
    return redirect(url_for("login"))

@app.route("/inicio")
@requiere_login
def inicio():
    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor()
        cursor.execute("SELECT COUNT(*) FROM estudiantes")
        total = cursor.fetchone()[0]
        cursor.close()
        conexion.close()
        return render_template("index.html", mensaje="Conexión exitosa a la base de datos.", total=total)
    except Exception as error:
        return render_template("index.html", mensaje=f"Error de conexión: {error}", total=0)

if __name__ == "__main__":
    app.run(debug=True)